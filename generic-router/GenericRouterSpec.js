describe('GenericRouter()', function() {
  'use strict';

  require('../bootstrap');

  const insulin       = require('insulin').mock();
  const GenericRouter = insulin.get('GenericRouter');
  const deferred      = insulin.get('deferred');
  const ndm           = insulin.get('ndm');
  const database      = new ndm.Database(require('./schema.json'));
  const users         = database.getTableByAlias('users');
  const usersCourses  = database.getTableByAlias('usersCourses');
  const daoMethods    = [
    'create', 'retrieve', 'retrieveByID', 'update', 'delete'
  ];

  let req, res, next, dao;

  beforeEach(function() {
    insulin.forget();

    // Fake request with dummy values.
    req = {
      body  : {},
      params: {}
    };

    // Fake response with json and status methods.  Status returns res so that
    // json() can be chained.
    res = jasmine.createSpyObj('res', ['json', 'status']);
    res.status.and.returnValue(res);

    // Mock next function.
    next = jasmine.createSpy('next');

    // Fake dao instance.
    dao = jasmine.createSpyObj('dao', daoMethods);
  });

  /**
   * Not found.
   */
  describe('NotFound tests.', function() {
    daoMethods.forEach(function(method) {
      it(`checks that if the dao has no ${method} method a 404 is returned.`, function() {
        const router = new GenericRouter({}, users);

        router[method](req, res, next);
        expect(next.calls.argsFor(0)[0].message).toBe(`Method ${method} not available.`);
      });
    });
  });

  /**
   * Error propagation.
   */
  describe('Error propagation tests.', function() {
    daoMethods.forEach(function(method) {
      it(`checks that ${method} errors are propagated.`, function() {
        const err    = new Error();
        const router = new GenericRouter(dao, users);

        dao[method].and.returnValue(deferred.reject(err));
        router[method](req, res, next);
        expect(next).toHaveBeenCalledWith(err);
      });
    });
  });

  /**
   * DAO method call check.
   */
  describe('DAO method call tests.', function() {
    daoMethods.forEach(function(method) {
      it(`checks that ${method} is called.`, function() {
        const router = new GenericRouter(dao, users);

        dao[method].and.returnValue(deferred.resolve({}));
        router[method](req, res, next);
        expect(dao[method]).toHaveBeenCalled();
      });
    });
  });

  /**
   * Serialization.
   */
  describe('JSON serialization tests.', function() {
    daoMethods.forEach(function(method) {
      it(`checks that a successful ${method} causes serialization.`, function() {
        const resource = {resourceID: 1};
        const router = new GenericRouter(dao, users);

        dao[method].and.returnValue(deferred.resolve(resource));
        router[method](req, res, next);
        expect(res.json).toHaveBeenCalledWith(resource);
      });
    });
  });

  /**
   * Update body.
   */
  describe('update body tests.', function() {
    ['create', 'update'].forEach(function(method) {
      it(`checks that if there is no parent ${method} does not trigger a body update.`, function() {
        const user   = {userID: 42};
        const router = new GenericRouter(dao, users);

        req.body = user;

        dao[method].and.returnValue(deferred.resolve(user));
        router[method](req, res, next);
        expect(res.json).toHaveBeenCalledWith(user);
      });

      it(`checks that if there is a parent, ${method} causes a body update.`, function() {
        const course = {userCourseID: 12};
        const router = new GenericRouter(dao, usersCourses, users);

        req.body = course;
        req.params.userID = 42;

        dao[method].and.returnValue(deferred.resolve(course));
        router[method](req, res, next);
        expect(res.json).toHaveBeenCalledWith(course);
        expect(req.body.userID).toBe(42);
      });

      it(`checks that if the pk is in params, ${method} causes a replace on body.`, function() {
        const user   = {userID: 42};
        const router = new GenericRouter(dao, users);

        req.params.userID = user.userID;

        dao[method].and.returnValue(deferred.resolve(user));
        router[method](req, res, next);
        expect(res.json).toHaveBeenCalledWith(user);
        expect(req.body.userID).toBe(42);
      });
    });
  });

  /**
   * Create.
   */
  describe('.create()', function() {
    it('checks that a successful create results in a 201.', function() {
      const router = new GenericRouter(dao, users);
      dao.create.and.returnValue(deferred.resolve({}));
      router.create(req, res, next);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  /**
   * Retrieve.
   */
  describe('.retrieve()', function() {
    let courses;

    beforeEach(function() {
      req.params.userID = 42;

      courses = [{userCourseID: 12}];
      dao.retrieve.and.returnValue(deferred.resolve(courses));
    });

    it('checks that if there is a parent table the parentID is passed to retrieve.', function() {
      const router = new GenericRouter(dao, usersCourses, users);
      router.retrieve(req, res, next);
      expect(dao.retrieve).toHaveBeenCalledWith(42);
      expect(res.json).toHaveBeenCalledWith(courses);
    });

    it('checks that if there is no parent table retrieve is called without arguments.', function() {
      const router = new GenericRouter(dao, users);
      router.retrieve(req, res, next);
      expect(dao.retrieve).toHaveBeenCalled();
      expect(dao.retrieve.calls.argsFor(0).length).toBe(0);
      expect(res.json).toHaveBeenCalledWith(courses);
    });
  });

  /**
   * Retrieve by ID.
   */
  describe('.retrieveByID()', function() {
    let course;

    beforeEach(function() {
      course = {userCourseID: 12};
      dao.retrieveByID.and.returnValue(deferred.resolve(course));
    });

    it('checks that the ID comes from params.', function() {
      const router = new GenericRouter(dao, usersCourses);
      req.params.userCourseID = 12;
      router.retrieveByID(req, res, next);
      expect(dao.retrieveByID).toHaveBeenCalledWith(12);
      expect(res.json).toHaveBeenCalledWith(course);
    });
  });

  /**
   * Update.
   */
  describe('.update()', function() {
    it('checks that update is called with req.body.', function() {
      const user  = {email: 'joe.tester@gmail.com'};
      const router = new GenericRouter(dao, users);

      req.body = user;
      req.params.userID = 42;

      dao.update.and.returnValue(deferred.resolve(user));

      router.update(req, res, next);
      expect(res.json).toHaveBeenCalledWith(user);
      expect(dao.update).toHaveBeenCalledWith(user);
      expect(req.body.userID).toBe(42); // updated.
    });
  });

  /**
   * Delete.
   */
  describe('.delete()', function() {
    it('checks that delete is called using the ID in params.', function() {
      const router = new GenericRouter(dao, users);
      const user   = {userID: 42};

      req.params.userID = user.userID;
      dao.delete.and.returnValue(deferred.resolve(user));

      router.delete(req, res, next);
      expect(res.json).toHaveBeenCalledWith(user);
      expect(dao.delete).toHaveBeenCalledWith({userID: 42});
    });
  });
});

