class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    // 1.) Filtering
    const queryObj = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach((el) => delete queryObj[el]);

    if (queryObj.platform === 'null') {
      queryObj.platform = null;
    }

    // 2.) Advanced Filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = JSON.parse(queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`));

    this.query = this.query.find(queryStr);

    return this;
  }

  sort() {
    // 3.) Sorting
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      const schemaFields = Object.keys(this.query.schema.paths);

      if (schemaFields.includes('cmc_rank')) {
        this.query = this.query.sort('cmc_rank');
      } else if (schemaFields.includes('id')) {
        this.query = this.query.sort('id');
      }
    }

    return this;
  }

  limitFields() {
    // 4.) Fields Limiting
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
    }

    return this;
  }

  async paginate(model) {
    // 5.) Pagination
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 100;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);

    if (this.queryString.page) {
      const numCryptos = await model.countDocuments(this.query._conditions);

      if (skip >= numCryptos) {
        return false;
      }
    }

    return true;
  }
}

module.exports = APIFeatures;
