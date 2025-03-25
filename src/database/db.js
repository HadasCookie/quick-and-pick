const mysql = require("mysql2");

// Database connection configuration
const pool = mysql.createPool({
  host: "34.136.219.66",
  user: "root",
  password: "your_password",
  database: "quickpick_users",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Test the connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error("Database connection failed: ", err);
  } else {
    console.log("Connected to MySQL Database!");
    connection.release();
  }
});

module.exports = pool;
