console.log('Start morjing')

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

const pad = (count, symbol) => count > 0 ? new Array(count+1).join(symbol||' '):'';
(async ()=> {
    const paths = {
        diffs: path.join( __dirname, 'diffs' ),
        pulls: path.join( __dirname, 'pulls' )
    };

    const pullsList = await readFiles( paths.pulls, true );
    const diffsList = await readFiles( paths.diffs, false );

    const diffsHash = {};
    diffsList.forEach((fileInfo)=>diffsHash[fileInfo.id] = fileInfo);

    for( let i = 0, _i = pullsList.length; i< _i; i++ ){
        const data = pullsList[i].data;
        for( let j = 0, _j = data.length; j < _j; j++ ){
            const pull = data[ j ];

            const id = pull.number;
            if(!(id in diffsHash)){

            }else{
                diffsHash[id].date = new Date(pull.created_at);
            }
        }
    }

    const hash = diffsList.map(function(diff, n){
        const added = diff.data.match(/\n\+[^+](.+)/g)
        if(added === null)
            return []
        const rows = added.map(l=>l.replace(/^[\+\n]*/,'').trim());
        const matched = rows
            .filter(line=>line.substr(1).indexOf('|')>1)
            .filter(function(line) {
                const tokens = line.split('|');
                if(tokens[1].replace(/[^a-zA-Zа-яА-Я]/g, '').trim().length===0) return false;
                if(tokens[1].match(/Фамилия/))
                    return false;
                return true;
            })
            .map(line=>
                line
                    .split('|')
                    .map((token)=>token.trim())
                    .filter(token=>token.length>0)
            )
            .filter(t=>t.length===2);
        if(matched.length===0 && n > 4)
            console.log(rows, diff)

        return matched.map(match=>{return {human:match, diff}})
    })
        .flat()
        .reduce((peopleHash, match)=>{
            const human = match.human
            if(human[0] in peopleHash && peopleHash[human[0]].job !== human[1])
                console.warn(peopleHash[human[0]].job,'!==', human[1])
            peopleHash[human[0]] = {job: human[1], date: match.diff.date};

            return peopleHash;
        }, {});

    let resultArr = [];
    for(let name in hash){
        let info = hash[name];
        resultArr.push({name, job: info.job, added: info.date })
    }
    resultArr.sort((a,b)=>a.added-b.added)
    resultArr.unshift({name: 'Фамилия и имя', job: 'Должность, компания'});
    const max = {name:0, job: 0};

    for( let i = 0, _i = resultArr.length; i < _i; i++ ){
        const human = resultArr[ i ];
        max.name = Math.max(max.name, human.name.length);
        max.job = Math.max(max.job, human.job.length);
    }
    console.log('People counter: '+resultArr.length);

    const humanCounter = (resultArr.length+'').length;
    const NUMERATE = true;

    fs.writeFileSync('out.md',

        resultArr.map(
            (human, n)=>
                '| '+ (NUMERATE?(n>0?n+pad(humanCounter-((n+'').length)):pad(humanCounter)) +' |':'')+
                    human.name + pad(max.name - human.name.length)+ ' | '+
                    human.job + pad(max.job - human.job.length)+

                ' |' + (n===0?'\n|:'+(NUMERATE?pad(humanCounter,'-')+'-|:':'-')+pad(max.name,'-')+'|:'+pad(max.job,'-')+'-|' :'') ).join('\n'));

    console.log('Output in out.md');
})();