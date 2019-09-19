(()=> {
    const people = /*paste everybody.json here*/{};
    const pad = (count, symbol) => count > 0 ? new Array(count+1).join(symbol||' '):'';

    const hash = [ ...$$( 'table' )[ 1 ].querySelectorAll( 'tr' ) ]
        .slice( 1 )
        .map( item => {
            const tds = item.querySelectorAll( 'td' );
            return { name: tds[ 1 ].innerText.trim(), job: tds[ 2 ].innerText.trim() }
        } )
        .reduce( ( acc, h ) => {
            acc[ h.name ] = h;
            return acc;
        }, {} );

    const resultArr = people.filter( function( h ){
        if( h.name in hash ){
            if( h.job !== hash[ h.name ].job ){
                console.warn( h.job, hash[ h.name ].job )
            }
            return false;
        }else{
            return true;
        }
    } )

    //resultArr.unshift( { name: 'Фамилия и имя', job: 'Должность, компания' } );
    const max = { name: 0, job: 0 };

    for( let i = 0, _i = resultArr.length; i < _i; i++ ){
        const human = resultArr[ i ];
        max.name = Math.max( max.name, human.name.length );
        max.job = Math.max( max.job, human.job.length );
    }
    console.log( 'People counter: ' + resultArr.length );

    const humanCounter = ( resultArr.length + '' ).length;
    const NUMERATE = false;

    const out = resultArr.map(
        ( human, n ) =>
             ( NUMERATE ? ( n > 0 ? n + pad( humanCounter - ( ( n + '' ).length ) ) : pad( humanCounter ) ) + ' |' : '' ) +
            human.name + pad( max.name - human.name.length ) + ' | ' +
            human.job + pad( max.job - human.job.length )

             //+ ( n === 0 ? '\n|:' + ( NUMERATE ? pad( humanCounter, '-' ) + '-|:' : '-' ) + pad( max.name, '-' ) + '|:' + pad( max.job, '-' ) + '-|' : '' )
            ).join( '\n' );

    console.log( out )
})()