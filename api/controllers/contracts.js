const db = require('../db');
const collection = db.get('contracts', { castIds: false });
const omit = require('lodash/omit');
const omitEmpty = require('./lib').omitEmpty;
const queryToPipeline = require('./lib').queryToPipeline;
const getQuery = require('./lib').getQuery;
const allDocuments = require('./lib').allDocuments;
const getDistinct = require('./lib').getDistinct;
const dataReturn = require('./lib').dataReturn;

const JOINS = [
  { $unwind: {
    path: '$suppliers_person',
    preserveNullAndEmptyArrays: true,
  },
  },
  { $unwind: {
    path: '$suppliers_org',
    preserveNullAndEmptyArrays: true,
  },
  },
  {
    $lookup: {
      from: 'organizations',
      localField: 'suppliers_org',
      foreignField: 'simple',
      as: 'suppliersOrg',
    },
  },
  {
    $lookup: {
      from: 'persons',
      localField: 'suppliers_person',
      foreignField: 'simple',
      as: 'suppliersPerson',
    },
  },
];

function contractMapData(object) {
  const data = omit(object, [
    'user_id',
    'suppliersOrg',
    'suppliersPerson',
    'dependencyOrg',
    'suppliers_org',
    'suppliers_person',
  ]);

  if (object.suppliersOrg[0] && object.suppliersOrg[0].simple) {
    data.suppliers_org = object.suppliersOrg;
  }
  if (object.suppliersPerson[0] && object.suppliersPerson[0].simple) {
    data.suppliers_person = object.suppliersPerson;
  }
  return omitEmpty(data);
}

function allContracts(req, res) {
  const query = getQuery(req);
  const offset = query.options.skip || 0;

  allDocuments(query, collection, JOINS)
    .then(array => (dataReturn(res, array, offset, query.embed, contractMapData)));
}

function allContractsPost(req, res) {
  const query = req.body.query;
  const project = req.body.project;
  const offset = project && project.skip || 0;
  const resultsP = collection.find(query);
  const countP = collection.count(query);

  res.set('Content-Type', 'application/json; charset=utf-8');
  return Promise.all([countP, resultsP])
    .then(array => (dataReturn(res, array, offset, query.embed, contractMapData)));
}

function distinctContract(req, res) {
  getDistinct(req, res, collection);
}

function singleContract(req, res) {
  const query = getQuery(req);
  const pipeline = queryToPipeline(query, JOINS);

  collection.aggregate(pipeline)
    .then(docs => (dataReturn(res, [1, docs], 0, true, contractMapData)));

}

module.exports = {
  allContracts,
  singleContract,
  allContractsPost,
  distinctContract,
};
