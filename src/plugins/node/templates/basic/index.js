/**
 * Basic Node.js Application
 *
 * This is a simple Node.js application template.
 * Modify this file to build your application.
 */

// Load environment variables
require('dotenv').config();

// Main application function
function main() {
  console.log('Hello from Node.js!');
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

  // Your application logic here
}

// Run the application
if (require.main === module) {
  main();
}

module.exports = { main };
