const fs = require('fs');
const crypto = require('crypto');
const util = require('util');
const Repository = require('./repository');

const scrypt = util.promisify(crypto.scrypt);

class UsersRepository extends Repository {
  async create(attrs) {
    //attrs === { email: '', password: ''}
    attrs.id = this.randomId();

    const salt = crypto.randomBytes(8).toString('hex');
    const hashed = await scrypt(attrs.password, salt, 64);

    const records = await this.getAll();
    const record = { ...attrs, password: `${hashed.toString('hex')}.${salt}` };
    records.push(record);
    //Write the updates records back to disk
    await this.writeAll(records);

    return record;
  }

  async comparePasswords(saved, supplied) {
    //Saved -> password saved in our database
    //Supplied -> Password given to us by the user
    const [hashed, salt] = saved.split('.');
    const hashedSuppliedBuf = await scrypt(supplied, salt, 64);
    return hashed === hashedSuppliedBuf.toString('hex');
  }
}

//Note that we weant to export an instance rather than the entire class
module.exports = new UsersRepository('users.json');
