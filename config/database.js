var mysql = require('mysql');

var pool = mysql.createPool({multipleStatements: true,
  connectionLimit : 100,
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'road_exp'
});

pool.getConnection((err,db) => {
  if (err) {
      throw err;
  }
  console.log('SQL Connected');
});

module.exports = pool;