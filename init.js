(function () {
  'use strict';
   // Start by defining the main module and adding the module dependencies
  angular
    .module('results', ['ngRoute', 'firebase'])
  
   .constant('URL', {
     FBAUTH:'https://aman-studentlist.firebaseio.com/web/uauth',
     FBRESULTS:'https://aman-studentlist.firebaseio.com/'
   }) 
   
   .service('fbAuthRef', function(URL) {
    return new Firebase(URL.FBAUTH)
   })
   
   .service('fbResultsRef', function(URL) {
    return new Firebase(URL.FBRESULTS)
   })
   
   .service('authObj', function($firebaseAuth, fbAuthRef) {
    return $firebaseAuth(fbAuthRef);
   })
   
   .factory('fbAuth', function($q, authObj) {

     // publicAPI   
    var service = {
        thirdPartyLogin: thirdPartyLogin,
        authWithPassword: authWithPassword,
        createUser: createUser,
        createUserAndLogin: createUserAndLogin,
        authAnonymously: authAnonymously
    };
    
    return service;
    
    // Handle third party login providers
    // returns a promise
    function thirdPartyLogin(provider) {
        var deferred = $q.defer();
        authObj.$authWithOAuthPopup(provider)
            .then(function(authData) {
                deferred.resolve(authData);
            })
            .catch(function(error) {
                deferred.reject(error);
            });
        return deferred.promise;
    }

    // Handle Email/Password login
    // returns a promise
    function authWithPassword(userObj) {
        var deferred = $q.defer();
        authObj.$authWithPassword(userObj)
            .then(function(authData) {
                deferred.resolve(authData);
            })
            .catch(function(error) {
                deferred.reject(error);
            });
        return deferred.promise;
    }

    // create a user but not login
    // returns a promsie
    function createUser(userObj) {
        var deferred = $q.defer();
        authObj.$createUser(userObj)
            .then(function(userData) {
                deferred.resolve(userData);
            })
            .catch(function(error) {
                deferred.reject(error);
            });
        return deferred.promise;
    }

    // Create a user and then login in
    // returns a promise
    function createUserAndLogin(userObj) {
        return createUser(userObj)
            .then(function() {
                return authWithPassword(userObj);
            });
    }

    // authenticate anonymously
    // returns a promise
    function authAnonymously() {
        var deferred = $q.defer();
        authObj.$authAnonymously()
            .then(function(authData) {
                deferred.resolve(authData);
            })
            .catch(function(error) {
                deferred.reject(error);
            });
        return deferred.promise;
    }

 })
.factory('Students', function($q, $firebaseArray, fbResultsRef, authObj, studentListValue) {

  var service = {
    fetch: fetch
  };
  
  return service;

  function fetch() {
      var deferred = $q.defer();
      var students;
      
      var authData = authObj.$getAuth();
      if(authData){
      var ref = fbResultsRef.child('students-fresh/' + authData.uid);
      ref.on('value', function(snapshot) {
          if (snapshot.val() === null) {
              ref.set(studentListValue);
          }
          students = $firebaseArray(ref);
          deferred.resolve(students);
       });
      }else{
         deferred.reject("AUTH_REQUIRED"); 
      }
  
      //Remove students list when no longer needed.
      //ref.onDisconnect().remove();
      return deferred.promise;
  }
})
.controller('HomeController', function(authObj) {
   var home = this;
   authObj.$onAuth(function(authData) {
       home.auth = authData;
   });
})
.controller('StudentListController', function($location, currentAuth, students, authObj) {
   if(currentAuth){
    var studentList = this;
    studentList.students = students;
   }else{
       $location.path('/');
   }
})

.controller('NewStudentController', function($location, students, authObj) {

    var editStudent = this;
    editStudent.save = function() {
      editStudent.student.date_of_birth = editStudent.student.date_of_birth.getTime();
      students.$add(editStudent.student).then(function(data) {
        $location.path('/');
      });
    };
    editStudent.cancel = function() {
      $location.path('/studentslist');
    };
})

.controller('EditStudentController', function($location, $routeParams, students, authObj) {

    var editStudent = this;
    var studentId = $routeParams.studentId,
        studentIndex;
    editStudent.students = students;
    studentIndex = editStudent.students.$indexFor(studentId);
    editStudent.student = editStudent.students[studentIndex];
    editStudent.date = new Date();
    //saving the old state of the student object
    var oldstudent = angular.copy(editStudent.student);
    editStudent.student.date_of_birth = new Date(editStudent.student.date_of_birth);
    
    editStudent.destroy = function() {
        editStudent.students.$remove(editStudent.student).then(function(data) {
            $location.path('/studentslist');
        });
    };

    editStudent.save = function() {
        editStudent.student.date_of_birth = editStudent.student.date_of_birth.getTime();
        editStudent.students.$save(editStudent.student).then(function(data) {
           $location.path('/');
        });
    };
    
    editStudent.cancel = function() {
        angular.copy(oldstudent,editStudent.student);
        $location.path('/studentslist');
    };
})
.controller('LoginController', function($rootScope, $location, authObj, fbAuth) {
    var login = this;
    
    var authData = authObj.$getAuth();
    if(authData){$location.path('/studentslist'); return;}
    
    login.verifyRegular = function(user) {
        var loginPromise = fbAuth.authWithPassword(user);
        loginPromise.then(function(authData) {
            $rootScope.alertInfo = {
                title: 'Logged In!!',
                detail: 'Using ' + authData.provider,
                className: 'alert alert-success'
            };
            $location.path('/studentslist');
        }).catch(function(err) {
            console.log(err);
            $rootScope.alertInfo = {
                title: err.code,
                detail: err.message,
                className: 'alert alert-danger'
            };
        });
    };

    login.verifySocial = function($event) {
        var provider = $event.currentTarget.attributes["data-provider"].value;
        var socialLoginPromise = fbAuth.thirdPartyLogin(provider);

        socialLoginPromise.then(function(authData) {
            $rootScope.alertInfo = {
                title: 'Logged In!!',
                detail: 'Using ' + authData.provider,
                className: 'alert alert-success'
            };
            $location.path('/studentslist');
        }).catch(function(err) {
            console.log(err);
            $rootScope.alertInfo = {
                title: err.code,
                detail: err.message,
                className: 'alert alert-danger'
            };
        });
    };

    login.verifyAnonymous = function() {
        var anonymousLoginPromise = fbAuth.authAnonymously();

        anonymousLoginPromise.then(function(authData) {
            $rootScope.alertInfo = {
                title: 'Logged In!!',
                detail: 'Anonymously',
                className: 'alert alert-success'
            };
            $location.path('/profile1');
        }).catch(function(err) {
            console.log(err);
            $rootScope.alertInfo = {
                title: err.code,
                detail: err.message,
                className: 'alert alert-danger'
            };
        });
    };

})

.controller('LogoutController', function($rootScope, $location, authObj) {

    authObj.$unauth();
    $rootScope.alertInfo = {
        title: 'You are not logged in!!',
        detail: '',
        className: 'alert alert-info'
    };
    $location.path('/logout');
})

.controller('RegisterController', function($rootScope, $location, authObj, fbAuth) {
    var register = this;
   
    var authData = authObj.$getAuth();
    if(authData){$location.path('/studentslist'); return;}
    
    register.registerUser = function(user) {
        var loginPromise = fbAuth.createUserAndLogin(user);
        loginPromise.then(function(authData) {
            $rootScope.alertInfo = {
                title: 'Successfully Registered!!',
                detail: 'You are now logged in',
                className: 'alert alert-success'
            };
            $location.path('/profile');
        }).catch(function(err) {
            console.log(err);
            $rootScope.alertInfo = {
                title: err.code,
                detail: err.message,
                className: 'alert alert-danger'
            };
        });
    };


})

.config(function($routeProvider) {
  var resolveStudents = {
      currentAuth: function(authObj) {
          return authObj.$requireAuth();
      },
      students: function(Students) {
          return Students.fetch();
      }
  };

  $routeProvider
    .when('/', {
      controller: 'LoginController as login',
      templateUrl: 'view/login.html',
    })
    .when('/register', {
      controller: 'RegisterController as register',
      templateUrl: 'view/register.html',
    })
    .when('/logout', {
      controller: 'LogoutController as logout',
      templateUrl: 'view/logout.html',
    })
    .when('/studentslist', {
      controller: 'StudentListController as studentList',
      templateUrl: 'view/studentlist.html',
      resolve: resolveStudents
    })
    .when('/edit/:studentId', {
      controller: 'EditStudentController as editStudent',
      templateUrl: 'view/detail.html',
      resolve: resolveStudents
    })
    .when('/profile/:studentId', {
      controller: 'EditStudentController as editStudent',
      templateUrl: 'view/profile.html',
      resolve: resolveStudents
    })
    .when('/new', {
      controller: 'NewStudentController as editStudent',
      templateUrl: 'view/detail.html',
      resolve: resolveStudents
    })
    .when('/contact', {
      templateUrl: 'view/contact.html',
    })
    .when('/about', {
      templateUrl: 'view/about.html',
    })
    .otherwise({
      redirectTo: '/'
    });
})

.directive('showAlert', function() {
    return {
        restrict: 'E',
        templateUrl: 'view/showAlert.html'
    };
})
.run(function($rootScope, $location) {
    $rootScope.$on("$routeChangeError", function(event, next, previous, error) {
        // We can catch the error thrown when the $requireAuth promise is rejected
        // and redirect the user back to the home page
        if (error === "AUTH_REQUIRED") {
            $location.path('/');
        }
    });
});

}());