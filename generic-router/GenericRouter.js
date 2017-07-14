'use strict';

require('insulin').factory('GenericRouter', GenericRouterProducer);

function GenericRouterProducer(NotFoundError, ValidationError) {
  /**
   * A base class for CRUD routers.
   */
  class GenericRouter {
    /**
     * Initialize the router.
     * @memberOf GenericRouter
     * @param {Object} dao A data-access object, implementing create,
     *        retrieve, retrieveByID, update, and delete methods.  Each method
     *        should return a promise.
     * @param {ndm.Table} table This is the
     *        table that CRUD is performed on.
     * @param {ndm.Table} [parentTable=null]An optional parent table.
     */
    constructor(dao, table, parentTable=null) {
      this.dao         = dao;
      this.table       = table;
      this.parentTable = parentTable;
    }

    /**
     * Private helper method to verify that a method exists on dao.  If not,
     * onNotFound is called.
     */
    _verifyImpl(method, req, res, next) {
      if (this.hasMethod(method)) {
        return true;
      }

      this.onNotImplemented(method, req, res, next);
      return false;
    }

    /**
     * Helper method that's used to check if dao has a method.
     * the dao does not have `method`.
     * @memberOf GenericRouter
     * @param {string} method The name of the method.
     * @returns {bool} true if the method exists, false otherwise.
     */
    hasMethod(method) {
      return this.dao[method] !== undefined;
    }
    
    /**
     * Overridable method that is called when a DAO method is not implemented.
     * By default calls next with a NotFoundError instance.
     * @memberOf GenericRouter
     * @param {string} method The name of the method.
     * @param {Object} req An Express request object.
     * @param {Object} res An Express response object.
     * @param {function} next An Express next method that is called with a
     *        NotFoundError instance if method is not defined on dao.
     */
    onNotImplemented(method, req, res, next) {
      next(new NotFoundError(`Method ${method} not available.`));
    }

    /**
     * Creates the resource in req.body.
     * @memberOf GenericRouter
     * @param {Object} req An Express request object containing a resouce
     *        in body.
     * @param {Object} res An Express response object.
     * @param {function} next Called with an Error instance if an error occurs.
     * @returns {void}
     */
    create(req, res, next) {
      if (!this._verifyImpl('create', req, res, next)) return;

      this.dao.create(req.body)
        .then(resource => res.status(201).json(resource))
        .catch(next);
    }

    /**
     * Retrieve a list of resources.  If there is a parent table, the
     * the ID of the parent table is _expected_ to be in params, and the ID is
     * passed to the dao retrieve method.  Otherwise, retrieve is called with no
     * parameters.
     * @memberOf GenericRouter
     * @param {Object} req An Express request object.
     * @param {Object} res An Express response object.
     * @param {function} next Called with an Error instance if an error occurs.
     * @returns {void}
     */
    retrieve(req, res, next) {
      if (!this._verifyImpl('retrieve', req, res, next)) return;

      let retRes;

      if (this.parentTable) {
        // There is a parent table.  Pull the parent's ID from params.
        const parentPKMapping = this.parentTable.primaryKey[0].mapTo;
        const parentID        = req.params[parentPKMapping];

        retRes = this.dao.retrieve(parentID);
      }
      else {
        retRes = this.dao.retrieve();
      }

      retRes
        .then(resources => res.json(resources))
        .catch(next);
    }

    /**
     * Retrieve a single resource by ID.  The resource ID is _expected_ to
     * be in params, and the ID is passed to the dao's retrieveByID method.
     * @memberOf GenericRouter
     * @param {Object} req An Express request object with a resource identifier
     *        in params.
     * @param {Object} res An Express response object.
     * @param {function} next Called with an Error instance if an error occurs.
     * @returns {void}
     */
    retrieveByID(req, res, next) {
      if (!this._verifyImpl('retrieveByID', req, res, next)) return;

      const pkMapping = this.table.primaryKey[0].mapTo;
      const ID        = req.params[pkMapping];

      this.dao.retrieveByID(ID)
        .then(resource => res.json(resource))
        .catch(next);
    }

    /**
     * Retrieve a list of resources, filtered using a where clause.  The where
     * clause is expected to be in a query property, as well a param property.
     * @memberOf GenericRouter
     * @param {Object} req An Express request object with where and param
     *        properties in query.
     * @param {Object} res An Express response object.
     * @param {function} next Called with an Error instance if an error occurs.
     * @returns {void}
     */
    retrieveWhere(req, res, next) {
      if (!this._verifyImpl('retrieve', req, res, next)) return;

      let where, params;

      try {
        if (req.query.where)
          where = JSON.parse(req.query.where);
      }
      catch (e) {
        next(new ValidationError(`"where" does not contain valid JSON: ${e.message}`, 'VAL_JSON', 'where'));
        return;
      }

      try {
        if (req.query.params)
          params = JSON.parse(req.query.params);
      }
      catch (e) {
        next(new ValidationError(`"params" does not contain valid JSON: ${e.message}`, 'VAL_JSON', 'params'));
        return;
      }

      try {
        this.dao.retrieve(where, params)
          .then(resources => res.json(resources))
          .catch(next);
      }
      catch (err) {
        if (err.code === 'CONDITION_ERROR')
          next(new ValidationError(err.message, err.code, 'where'));
        else
          next(err);
      }
    }

    /**
     * Update the resource in req.body.
     * @memberOf GenericRouter
     * @param {Object} req An Express request object containing a resouce
     *        in body.  The identifier of the resource is _expected_ to be
     *        in params.
     * @param {Object} res An Express response object.
     * @param {function} next Called with an Error instance if an error occurs.
     * @returns {void}
     */
    update(req, res, next) {
      if (!this._verifyImpl('update', req, res, next)) return;

      this.dao.update(req.body)
        .then(resource => res.json(resource))
        .catch(next);
    }

    /**
     * Delete the resource identified in req.params.
     * @memberOf GenericRouter
     * @param {Object} req An Express request object containing a resource
     *        identifier in params.
     * @param {Object} res An Express response object.
     * @param {function} next Called with an Error instance if an error occurs.
     * @returns {void}
     */
    delete(req, res, next) {
      if (!this._verifyImpl('delete', req, res, next)) return;

      const pkMapping = this.table.primaryKey[0].mapTo;
      const ID        = req.params[pkMapping];

      this.dao.delete({[pkMapping]: ID})
        .then(resources => res.json(resources))
        .catch(next);
    }

    /**
     * Replace all of the sub resources identified in req.params.  The parent ID
     * is _expected_ to be in params.
     * @memberOf GenericRouter
     * @param {Object} req An Express request object containing a parent resource
     *        identifier in params, and an array of resources to replace in body.
     * @param {Object} res An Express response object.
     * @param {function} next Called with an Error instance if an error occurs.
     * @returns {void}
     */
    replace(req, res, next) {
      if (!this._verifyImpl('replace', req, res, next)) return;

      if (!this.parentTable) {
        throw new Error('Parent table is required for replace operations.');
      }

      const pPKMapping = this.parentTable.primaryKey[0].mapTo;
      const pID        = req.params[pPKMapping];

      this.dao.replace(this.parentTable.name, pID, req.body)
        .then(resources => res.status(201).json(resources))
        .catch(next);
    }

    /**
     * Options is used to get the schema of the API, which documents what
     * properties are accepted, required, etc.
     * @memberOf GenericRouter
     * @param {Object} req An Express request object containing a parent resource
     *        identifier in params, and an array of resources to replace in body.
     * @param {Object} res An Express response object.
     * @param {function} next Called with an Error instance if an error occurs.
     * @returns {void}
     */
    options(req, res, next) {
      if (!this._verifyImpl('options', req, res, next)) return;

      this.dao.options()
        .then(desc => res.json(desc))
        .catch(next);
    }
  }

  return GenericRouter;
}

