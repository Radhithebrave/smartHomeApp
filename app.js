// IndexedDB Functions
let db;

// Open IndexedDB with proper versioning
const openDatabase = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('smartHomeDB', 2); // Increment version to force update

        request.onupgradeneeded = (event) => {
            db = event.target.result;

            // Create object stores if they don't exist
            if (!db.objectStoreNames.contains('responses')) {
                db.createObjectStore('responses', { keyPath: 'url' });
            }

            if (!db.objectStoreNames.contains('settings')) {
                db.createObjectStore('settings', { keyPath: 'key' });
            }

            console.log('Object stores created or upgraded successfully.');
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
};

// Store response in IndexedDB
const storeInIndexedDB = async (url, response) => {
    const db = await openDatabase();
    const clonedResponse = await response.clone().arrayBuffer();
    const blob = new Blob([clonedResponse]);

    const transaction = db.transaction(['responses'], 'readwrite');
    const objectStore = transaction.objectStore('responses');
    objectStore.put({ url, data: blob });
};

// Retrieve response from IndexedDB
const getFromIndexedDB = async (url) => {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['responses'], 'readonly');
        const objectStore = transaction.objectStore('responses');
        const request = objectStore.get(url);

        request.onsuccess = (event) => {
            if (event.target.result) {
                const blob = event.target.result.data;
                resolve(new Response(blob));
            } else {
                resolve(null);
            }
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
};

// AngularJS App Setup
var app = angular.module('smartHomeApp', ['ngRoute']);

app.config(function($routeProvider) {
    $routeProvider
        .when('/', {
            templateUrl: 'login.html',
            controller: 'LoginController'
        })
        .when('/main', {
            templateUrl: 'main.html',
            controller: 'MainController'
        })
        .otherwise({
            redirectTo: '/'
        });
});

// Login Controller
app.controller('LoginController', function($scope, $location) {
    $scope.user = {};  // Initialize empty user object
    $scope.message = '';

    $scope.login = function() {
        if ($scope.user.username && $scope.user.password) {
            // Record login action in IndexedDB
            addToDatabase('username', $scope.user.username);
            addToDatabase('password', $scope.user.password);

            // Navigate to main page
            $location.path('/main');
        } else {
            $scope.message = 'Please enter both username and password.';
        }
    };
});

// Main Controller
app.controller('MainController', function($scope) {
    $scope.rooms = {
        kitchen: { temperature: 22, lights: false },
        livingRoom: { temperature: 24, lights: false },
        studyRoom: { temperature: 20, lights: false },
        bedRoom: { temperature: 22, lights: false }
    };

    $scope.overall = {
        temperature: 22,
        lights: false
    };

    $scope.toggleLights = function(room) {
        $scope.rooms[room].lights = !$scope.rooms[room].lights;
        let action = $scope.rooms[room].lights ? 'Lights ON' : 'Lights OFF';
        addToDatabase(room, `Toggle Lights: ${action}`);
    };

    $scope.updateTemperature = function(room, value) {
        $scope.rooms[room].temperature += value;
        addToDatabase(room, `Temperature Adjusted to: ${$scope.rooms[room].temperature}°C`);
    };

    $scope.applyOverallSettings = function() {
        angular.forEach($scope.rooms, function(value, key) {
            value.temperature = $scope.overall.temperature;
            value.lights = $scope.overall.lights;
        });
        addToDatabase('overall', `Overall Temperature: ${$scope.overall.temperature}°C, Lights: ${$scope.overall.lights ? 'ON' : 'OFF'}`);
    };
});

// Function to add entries to IndexedDB
function addToDatabase(key, value) {
    let request = indexedDB.open('smartHomeDB', 2); // Use correct database version

    request.onsuccess = function(event) {
        let db = event.target.result;
        let transaction = db.transaction(['settings'], 'readwrite');
        let objectStore = transaction.objectStore('settings');
        objectStore.put({ key: key, value: value });
        transaction.oncomplete = function() {
            console.log(`Successfully added to IndexedDB: ${key} = ${value}`);
        };
    };

    request.onerror = function(event) {
        console.error('IndexedDB error:', event.target.errorCode);
    };
}

// Register the service worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/smartHomeApp/service-worker.js')
        .then((registration) => {
            console.log('Service Worker registered with scope:', registration.scope);
            testStorage();
        })
        .catch((error) => {
            console.error('Service Worker registration failed:', error);
        });
    });
}

// Test function for IndexedDB
const testStorage = async () => {
    try {
        const url = 'http://127.0.0.1:5500/smartHomeApp/style.css';
        const response = await fetch(url);
        if (response.ok) {
            await storeInIndexedDB(url, response.clone());
            console.log('File stored in IndexedDB:', url);
        } else {
            console.error('Fetch failed for:', url);
        }
    } catch (error) {
        console.error('Error during manual storage test:', error);
    }
};
