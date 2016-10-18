'use strict';

require('insulin').factory('GenericRouter', GenericRouterProducer);

function GenericRouterProducer(NotFoundError) {
  /**
   * A base class for CRUD routers.
   */
  class GenericRouter {
    /**
     * Initialize the router.
     * @memberOf GenericRouter
     * @param {object} dao A data-access object, implementing create,
     *        retrieve, retrieveByID, update, and delete methods.  Each method
     *        should return a promise.
     * @param {ndm.Table} table This is the
     *        table that CRUD is performed on.
     * @param {ndm.Table} parentTable An optional parent table.
     */
    constructor(dao, table, parentTable) {
      this.dao         = dao;
      this.table       = table;
      this.parentTable = parentTable || null;
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
     * @param {object} req An Express request object.
     * @param {object} res An Express response object.
     * @param {function} next An Express next method that is called with a
     *        NotFoundError instance if method is not defined on dao.
     */
    onNotImplemented(method, req, res, next) {
      next(new NotFoundError(`Method ${method} not available.`));
    }

    /**
     * If there is a parent, update the req.body with the parent ID from
     * req.params.  The parent ID is _expected_ to be in params.
     * @memberOf GenericRouter
     * @param {object} req An Express request object.
     * @returns {bool} false if there is an error, true otherwise.  An error
     *          results in next() being called with an Error instance.
     */
    updateBody(req) {
      const pkAlias = this.table.getPrimaryKey()[0].getAlias();
      let   parentPKAlias;

      if (req.params[pkAlias]) {
        req.body[pkAlias] = req.params[pkAlias];
      }

      if (!this.parentTable) {
        return true;
      }

      parentPKAlias = this.parentTable.getPrimaryKey()[0].getAlias();

      req.body[parentPKAlias] = req.params[parentPKAlias];
      return true;
    }

    /**
     * Creates the resource in req.body.  If there is a parent table, then the
     * parent's identifier is _expected_ to be in params.  The parent ID in
     * params blindly overwrites the parentID in body.
     * @memberOf GenericRouter
     * @param {object} req An Express request object containing a resouce
     *        in body.
     * @param {object} res An Express response object.
     * @param {function} next Called with an Error instance if an error occurs.
     * @returns {void}
     */
    create(req, res, next) {
      if (!this._verifyImpl('create', req, res, next)) return;
      if (!this.updateBody(req)) return;

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
     * @param {object} req An Express request object.
     * @param {object} res An Express response object.
     * @param {function} next Called with an Error instance if an error occurs.
     * @returns {void}
     */
    retrieve(req, res, next) {
      if (!this._verifyImpl('retrieve', req, res, next)) return;

      let retRes;

      if (this.parentTable) {
        // There is a parent table.  Pull the parent's ID from params.
        const parentPKAlias = this.parentTable.getPrimaryKey()[0].getAlias();
        const parentID      = req.params[parentPKAlias];

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
     * @param {object} req An Express request object with a resource identifier
     *        in params.
     * @param {object} res An Express response object.
     * @param {function} next Called with an Error instance if an error occurs.
     * @returns {void}
     */
    retrieveByID(req, res, next) {
      if (!this._verifyImpl('retrieveByID', req, res, next)) return;

      const pkAlias = this.table.getPrimaryKey()[0].getAlias();
      const ID      = req.params[pkAlias];

      this.dao.retrieveByID(ID)
        .then(resource => res.json(resource))
        .catch(next);
    }

    /**
     * Update the resource in req.body.  The resource ID is _expected_ to be in
     * req.params and blindly overwrites the ID in body if it is present.  If
     * there is a parent table, the parent's ID is _expcted_ to be in
     * req.params and likewise blindly overwrites the id in body.
     * @memberOf GenericRouter
     * @param {object} req An Express request object containing a resouce
     *        in body.  The identifier of the resource is _expcted_ to be
     *        in params.
     * @param {object} res An Express response object.
     * @param {function} next Called with an Error instance if an error occurs.
     * @returns {void}
     */
    update(req, res, next) {
      if (!this._verifyImpl('update', req, res, next)) return;
      if (!this.updateBody(req)) return;

      this.dao.update(req.body)
        .then(resource => res.json(resource))
        .catch(next);
    }

    /**
     * Delete the resource identified in req.params.
     * @memberOf GenericRouter
     * @param {object} req An Express request object containing a resource
     *        identifier in params.
     * @param {object} res An Express response object.
     * @param {function} next Called with an Error instance if an error occurs.
     * @returns {void}
     */
    delete(req, res, next) {
      if (!this._verifyImpl('delete', req, res, next)) return;

      const pkAlias = this.table.getPrimaryKey()[0].getAlias();
      const ID      = req.params[pkAlias];

      this.dao.delete({[pkAlias]: ID})
        .then(resources => res.json(resources))
        .catch(next);
    }

    /**
     * Replace all of the sub resources identified in req.params.
     * @memberOf GenericRouter
     * @param {object} req An Express request object containing a parent resource
     *        identifier in params, and an array of resources to replace in body.
     * @param {object} res An Express response object.
     * @param {function} next Called with an Error instance if an error occurs.
     * @returns {void}
     */
    replace(req, res, next) {
      if (!this._verifyImpl('replace', req, res, next)) return;

      if (!this.parentTable) {
        throw new Error('Parent table is required for replace operations.');
      }

      const pPKAlias = this.parentTable.getPrimaryKey()[0].getAlias();
      const pID      = req.params[pPKAlias];

      this.dao.replace(this.parentTable.getName(), pID, req.body)
        .then(resources => res.status(201).json(resources))
        .catch(next);
    }
  }

  return GenericRouter;
}

