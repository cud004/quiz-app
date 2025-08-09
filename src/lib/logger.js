const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.logDir = path.join(process.cwd(), 'logs');
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const logMessage = {
      timestamp,
      level,
      message,
      ...meta
    };
    return JSON.stringify(logMessage);
  }

  writeToFile(filename, message) {
    const logFile = path.join(this.logDir, filename);
    fs.appendFileSync(logFile, message + '\n');
  }

  info(message, meta = {}) {
    const formattedMessage = this.formatMessage('INFO', message, meta);
    console.log(`ℹ️  ${formattedMessage}`);
    
    if (process.env.NODE_ENV === 'production') {
      this.writeToFile('app.log', formattedMessage);
    }
  }

  error(message, meta = {}) {
    const formattedMessage = this.formatMessage('ERROR', message, meta);
    console.error(`❌ ${formattedMessage}`);
    
    if (process.env.NODE_ENV === 'production') {
      this.writeToFile('error.log', formattedMessage);
    }
  }

  warn(message, meta = {}) {
    const formattedMessage = this.formatMessage('WARN', message, meta);
    console.warn(`⚠️  ${formattedMessage}`);
    
    if (process.env.NODE_ENV === 'production') {
      this.writeToFile('app.log', formattedMessage);
    }
  }

  debug(message, meta = {}) {
    if (process.env.NODE_ENV === 'development') {
      const formattedMessage = this.formatMessage('DEBUG', message, meta);
      console.debug(`🐛 ${formattedMessage}`);
    }
  }

  success(message, meta = {}) {
    const formattedMessage = this.formatMessage('SUCCESS', message, meta);
    console.log(`✅ ${formattedMessage}`);
    
    if (process.env.NODE_ENV === 'production') {
      this.writeToFile('app.log', formattedMessage);
    }
  }
}

// Create and export a singleton instance
const logger = new Logger();

module.exports = logger; 