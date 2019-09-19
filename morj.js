console.log('Start morjing')
const request = require('request-promise-native');

const fs = require('fs'),
    { promisify } = require('util'),
    readdirAsync = promisify(fs.readdir),
    readFileAsync = promisify(fs.readFile),
    path = require('path');

const filterAndSortFiles = (list)=>
    list.filter((f)=>f.charAt(0)!=='.')
        .map((f)=>{
            return {name: f, id: parseInt(f.split('.')[0], 10)};
        })
        .sort((a, b)=>a.id - b.id );

const readFiles = async function(dir, parse){
    const list = filterAndSortFiles(await readdirAsync(dir));

    await Promise.all(
        list.map((item)=>{
            return readFileAsync(path.join(dir, item.name), 'utf-8')
                .then((data)=>{
                    try{
                        item.data = parse ? JSON.parse( data ) : data;
                    }catch(e){
                        item.data = {}
                    }
                });
        }));

    return list;
};

const queryPullsPage = async function(page) {
    console.log('Query pulls page '+ page);
    const response = await request({url: 'https://api.github.com/repos/developers-against-repressions/case-212/pulls?state=all&page='+page+'&direction=asc',
        headers: {'User-Agent': 'Awesome-Morj-App'}
    });
    let obj;
    try{
        obj = JSON.parse(response)
        console.log('\tPage '+ page +' response contains '+obj.length+' pulls');
    }catch( e ){
        throw new Error('Can not parse JSON:\n'+e)
    }

    return obj;
};

(async ()=>{
    const paths = {
        diffs: path.join(__dirname, 'diffs'),
        pulls: path.join(__dirname, 'pulls')
    };

    const pullsList = await readFiles(paths.pulls, true);
    const diffsList = await readFiles(paths.diffs, false);

    let maxID = 0;
    let enough = false;
    for( let i = 0, _i = pullsList.length; !enough; i++ ){
        let file;
        if(i < _i && pullsList[ i ] && Array.isArray(pullsList[ i ].data)){
            file = pullsList[ i ];
        }else{
            maxID++;
            file = {id: maxID, data: [], name: `${maxID}.json`}
        }

        maxID = file.id;
        if(!file.data.length || file.data.length<30){
            // rerequest

            file.data = await queryPullsPage(maxID);
            fs.writeFile(path.join(paths.pulls, file.name), JSON.stringify(file.data), (err)=>{
                if(err)
                    throw err;
            });
            if(file.data.length<30)
                enough = true;
            pullsList[ i ] = file;
        }
        //if(i===2)enough = true
    }

    // check corresponding diffs existence

    const diffsHash = {};
    diffsList.forEach((fileInfo)=>diffsHash[fileInfo.id] = fileInfo);

    for( let i = 0, _i = pullsList.length; i< _i; i++ ){
        const data = pullsList[i].data;
        for( let j = 0, _j = data.length; j < _j; j++ ){
            const pull = data[ j ];

            const id = pull.number;
            if(!(id in diffsHash)){
                try{
                    console.log('\tRequesting pull '+id);
                    const response = await request( {
                        url: pull.diff_url,
                        headers: { 'User-Agent': 'Awesome-Morj-App' }
                    } );

                    fs.writeFile(path.join(paths.diffs, id+'.json'), response, (err)=>{
                        if(err)
                            throw err;
                    });
                    console.log('\t\t Response pull '+id);
                    diffsHash[id] = {data: response, id: pull.number, date: pull.created_at}
                    diffsList.push(diffsHash[id]);
                }catch(e){
                    console.error('Error in getting diff from '+ pull.diff_url);
                    throw new Error(e);
                }
            }else{
                diffsHash[id].date = pull.created_at;
            }
        }
    }

    console.log(pullsList)
})();

()=> {
    const https = require( 'https' )


    doQuery(
        'https://api.github.com/repos/developers-against-repressions/case-212/pulls',
        {
            state: 'all',
            page: 1,
            direction: 'asc'
        }
    )

}