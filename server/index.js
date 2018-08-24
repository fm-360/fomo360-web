let express    = require('express');
let app        = express();
let http       = require('http').Server(app);
let fs         = require('fs');
let bodyParser = require('body-parser');
let path       = require('path');
const sqlite   = require('sqlite3')
let db = null

const GAME_START_TIME = '2018-08-26 20:00:00'
const DB_PATH = './db/reserves.db'
const openDB = () => {
    return new sqlite.Database(DB_PATH, (err) => {
        if (err) {
            return console.error(err.message)
        }
        // console.log('Connected to the database.')
    })
}

const closeDB = (db) => {
    db.close((err) => {
        if (err) {
          console.error(err.message);
        }
        //console.log('Close the database connection.');
    })
}

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Content-Type,Content-Length, Authorization, Accept,X-Requested-With");
    res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
    next();
});

app.use(express.static(path.join(__dirname, '../build')));

app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(bodyParser.json())

app.get('/api/configs', function(req, res, next){

    let totalAmount = 0
    let db = openDB()

    db.all(`SELECT addr as address,
                    amount
                FROM reserve`, (err, rows) => {
        if (err) {
            console.error(err.message);
            return res.status(400).json({'error':'cannot parse data', 'result':err.message})
        }

        for (var i=0; i< rows.length; i++) {
            totalAmount += rows[i].amount
        }
        res.json({
            'result': {
                'game_start': GAME_START_TIME,
                'count': rows.length,
                'amount': totalAmount
            }
        })
    });

    closeDB(db)
});

app.post('/api/reserve', function(req, res, next){

    let address = req.body.address
    let amount = req.body.eth

    let db = openDB()
    db.run("INSERT INTO reserve VALUES ($addr, $amount)", {
        $addr: address,
        $amount: amount
    }, (err) => {
        if (err) {
            console.error(err)
            let errCode = 'reserve_failed'
            if ('SQLITE_CONSTRAINT' == err.code)
                errCode = 'reserve_failed_duplicate'
            return res.json({'error':errCode, 'result':err.message})
        }
        console.log(db.changes, 'Added ', address, ', amount: ', amount)
        res.send({
            'result': {
                'address': address,
                'amount': amount
            }
        })
    })
    closeDB(db)
});

var port = process.env.PORT || 9000

http.listen(port, function(){
    let db = openDB()
    db.run("CREATE TABLE IF NOT EXISTS reserve (addr TEXT UNIQUE PRIMARY KEY, amount INTEGER)", (err) => {
        if (err) {
            return console.error(err.message)
        }
    })
    closeDB(db)

    console.log('http server running on port ', port);
});
