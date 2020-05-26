const fs = require('fs');
const crypto = require('crypto');
const util = require('util');

const scrypt = util.promisify(crypto.scrypt);

class UsersRepository {
  constructor(filename) {
    //Note that we are only allowed to have syncrhonous code in the constructor
    if (!filename) {
      throw new Error('Creating a repository requires a filename');
    }

    this.filename = filename;

    //Because we are only going to ever use one instance of the users repository
    //We can use access sync, otherwise there will be performance overhead
    try {
      fs.accessSync(this.filename);
    } catch {
      fs.writeFileSync(this.filename, '[]');
    }
  }

  async getAll() {
    //Open, read and parse the file called this.filename
    return JSON.parse(
      await fs.promises.readFile(this.filename, {
        encoding: 'utf8',
      })
    );
  }

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

  async writeAll(records) {
    await fs.promises.writeFile(
      this.filename,
      JSON.stringify(records, null, 2)
    );
  }

  randomId() {
    return crypto.randomBytes(4).toString('hex');
  }

  async getOne(id) {
    const record = await this.getAll();
    return record.find((record) => record.id === id);
  }

  async delete(id) {
    const records = await this.getAll();
    const filteredRecords = records.filter((record) => record.id !== id);
    await this.writeAll(filteredRecords);
  }

  async update(id, attrs) {
    const records = await this.getAll();
    const record = records.find((rec) => rec.id === id);

    if (!record) {
      throw new Error(`Record with id of ${id} not found`);
    }

    Object.assign(record, attrs); //Special function that copies all attris from attrs into records
    await this.writeAll(records);
  }

  async getOneBy(filters) {
    const records = await this.getAll();
    for (let rec of records) {
      let found = true;
      //Can use lodash.equals here
      for (let key in filters) {
        if (rec[key] !== filters[key]) {
          found = false;
        }
      }
      if (found) {
        return rec;
      }
    }
  }
}

//Note that we weant to export an instance rather than the entire class
module.exports = new UsersRepository('users.json');
