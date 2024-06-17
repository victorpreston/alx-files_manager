import sha1 from 'sha1';

class Password {
  /**
   * Encrypts a password using sha1
   * @param {string} password - password to encrypt
   * @returns - encrypted password
   */
  static encryptPassword(password) {
    return sha1(password);
  }

  /**
   * Checks if a password is valid
   * @param {string} password - password to check
   * @param {string} hashedPassword - hashed password to compare against
   * @returns {boolean} - true if password is valid, false otherwise
   */
  static isPasswordValid(password, hashedPassword) {
    return sha1(password) === hashedPassword;
  }
}

export default Password;