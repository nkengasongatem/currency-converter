
function openIndexedDB() {
    // Check if browser supports Service Workers -> [Always do]
    if (!navigator.serviceWorker) { return Promise.resolve(); }
        return idb.open('currencyConverter', 1, upgradeDb => {
            let currencyStore = upgradeDb.createObjectStore('currencies', {
                keyPath: 'id'
            });
            currencyStore.createIndex('by-name', 'currencyName');

            let exchangeRateStore = upgradeDb.createObjectStore('rates', {
                keyPath: 'query'
        });
    });
}


this.openIndexedDB();

// Get the currencies from the api
function getCurrencies() {
    // 1. First, .getAll the currencies from idb if any
    this.openIndexedDB().then(db => {
        if (!navigator.serviceWorker) { return } 
        return db.transaction('currencies').objectStore('currencies').getAll();
    }).then( currencies => {  
        let selectWant = document.getElementById("currency-want");
        let selectHave = document.getElementById("currency-have");
        selectWant.options.length = 0;
        selectHave.options.length = 0;

        for (let data in currencies) {
            let currency = currencies[data];
            // Load the currencies into the first select element
            let option = document.createElement("option");
            option.value =`${currency.id}`;
            option.text = `${currency.id} ${currency.currencyName}`;
            selectWant.add(option);
            // Load the currencies into the second select element
            option = document.createElement("option");
            option.value =`${currency.id}`;
            option.text = `${currency.id} ${currency.currencyName}`;
            selectHave.add(option); 
        }  
        console.log("Cached : ",currencies.length + " currencies");
    });

    // 2. Next, fetch the currencies using the api[network]
    fetch('https://free.currencyconverterapi.com/api/v5/currencies')
        .then(
            res => { return res.json() })
        .then(
            currencies => {
               const results = currencies.results;
               // 3. Now, .put each currency from the api[network] into the 'currencyConverter' idb
               for (let data in results) {
                   let currency = results[data];                   
                   this.openIndexedDB().then(db => {
                        if (!navigator.serviceWorker) { return }; 
                        let tx = db.transaction('currencies', 'readwrite');
                        let currencyStore = tx.objectStore('currencies');
                        currencyStore.put(currency);
                        tx.complete;
                    });      
                            
                   // create the options element for the first select element
                   let selectWant = document.getElementById("currency-want");
                   let option = document.createElement("option");
                   option.value =`${currency.id}`;
                   option.text = `${currency.id} ${currency.currencyName}`;
                   selectWant.add(option);
                   // create the options element for the second select element
                   let selectHave = document.getElementById("currency-have");
                   option = document.createElement("option");
                   option.value =`${currency.id}`;
                   option.text = `${currency.id} ${currency.currencyName}`;
                   selectHave.add(option); 
               } 
        })
        .catch(error => {console.log("You are currently offline - couldn't load currencies");
    })          
}

this.getCurrencies();


// Offline Notification
function OfflineNotification() {
    // Alternatively, a toast can be used
    if (Notification.permission == 'granted') {
        navigator.serviceWorker.getRegistration().then(function(reg) {
          var options = {
            body: 'Connect to the Internet to get the latest exchange rates and enjoy!',
            icon: 'imgs/currencyconverter.png',
            vibrate: [100, 50, 100],
            data: {
              dateOfArrival: Date.now(),
              primaryKey: 1
            }
          };
          reg.showNotification('Network Unavailable!', options);
        });
    }
}

// Use the api to convert currencies
function convertCurrency(amount, fromCurrency, toCurrency) {
  
    fromCurrency = encodeURIComponent(fromCurrency);
    toCurrency = encodeURIComponent(toCurrency);
    let query = fromCurrency + '_' + toCurrency;
    let reverseQuery =  toCurrency + '_' + fromCurrency;
    let converturlapi = 'https://free.currencyconverterapi.com/api/v5/convert?q='+ query + '&compact=ultra';

    // 1. First, .get the exchange rates from idb
    this.openIndexedDB().then(db => {
        if (!navigator.serviceWorker) { return } 
        return db.transaction('rates').objectStore('rates').get(query);
    }).then( data => {  
       /* USE THE RATES TO PERFORM CONVERTION */ 
       if (data){
            document.getElementById('result').value = Math.round((data.rate * amount) * 100) / 100;
            //console.log('Offline Mode: Convertion from idb');
       }
    });

    // 2. Next, fetch the exchange rate using the api[network]
    fetch(converturlapi)
        .then((response) => {
            return response.json()
        })
        .then(
            data => {
                let exchangeRate = data[query];
                let reverseExchangeRate = 1/exchangeRate;
                if (exchangeRate) {
                    // 3. Now, .put the query, reverseQuery, exchangeRate and reverseExchangeRate in the 'rates' idb
                    this.openIndexedDB().then(db => {
                        if (!navigator.serviceWorker) { return } 
                        let tx = db.transaction('rates', 'readwrite');
                        let ratesStore = tx.objectStore('rates');
                        ratesStore.put(
                            { "rate": exchangeRate, "query": query }
                        );
                        ratesStore.put(
                            { "rate": reverseExchangeRate, "query": reverseQuery }
                        );
                        return tx.complete;
                    }); 

                    // Perform the calculation
                    let result = exchangeRate * amount;
                    document.getElementById('result').value = Math.round(result * 100) / 100;
                } else {
                    console.log("This Exchange rate is not yet available"); 
                }
            }
        )     
        .catch(() => { this.OfflineNotification();})
}

// Perform the convertion when user clicks convert button
function convert() {
    const amount = document.getElementById('input-value').value;
    const fromCurrency = document.getElementById('currency-have').value;
    const toCurrency = document.getElementById('currency-want').value;
    convertCurrency(amount, fromCurrency, toCurrency);
    console.log(amount + ' ' + fromCurrency + ' to ' + toCurrency + ' Convertion was succcessful');

    if (Notification.permission !== 'granted') {
        // Get user permission for Push Notifications
        Notification.requestPermission(status => {
            console.log('Notification permission status:', status);
        });
    }
    
}

// Add a service worker and a message listener to the app
if ('serviceWorker' in navigator) {
    navigator.serviceWorker
        .register('service-worker.js')
        .then((reg) => {
            console.log('Service Worker Registered');
            // Check if we have a subscription
            reg.pushManager.getSubscription().then(function(sub) {
                if (sub === null) {
                    // Update UI to ask user to register for Push Notifications
                    console.log('Not subscribed to push service!');
                } else {
                    // Hooray, We have a subscription, update the database
                    console.log('Subscription object: ', sub);
                }
            });
        })
        .catch((error) => {console.log('Service Worker registration failed, error: ', error);});
}

 // Reload the page because navigator.serviceWorker.controller has changed
 let refreshing;
 navigator.serviceWorker.addEventListener('controllerchange', () =>{
     if(refreshing) return;
     refreshing = true;
     window.location.reload();
     console.log('App Update Complete. Enjoy!');
 });

// Only display update notification when new service worker is available
function listenForWaitingServiceWorker(reg, callback) {
    function awaitStateChange() {
      reg.installing.addEventListener('statechange', function() {
        if (this.state === 'installed') callback(reg);
      });
    }
    if (!reg) return;
    if (reg.waiting) return callback(reg);
    if (reg.installing) awaitStateChange();
    reg.addEventListener('updatefound', awaitStateChange);
  }

  function promptUserToRefresh(reg) {
    // WILLDO:: Will definitely change this confirm box to a fancy one
    if (window.confirm("New version available! Update Now?")) {
      reg.waiting.postMessage('skipWaiting');
    }
  }

  if (Notification.permission == 'granted') {
    navigator.serviceWorker.getRegistration().then(reg => {
        listenForWaitingServiceWorker(reg, promptUserToRefresh);
    });
  } else if (Notification.permission === "blocked") {
      /* the user has previously denied push. Can't reprompt. */
  } 

  // Subscribe to the push service if user enabled notifications
  function subscribeUser() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(function(reg) {
  
        reg.pushManager.subscribe({
          userVisibleOnly: true
        }).then(function(sub) {
          console.log('Endpoint URL: ', sub.endpoint);
        }).catch(function(e) {
          if (Notification.permission === 'denied') {
            console.warn('Permission for notifications was denied');
          } else {
            console.error('Unable to subscribe to push', e);
          }
        });
      })
    }
  } 

  /*
   * NO NEED TO DELETE OLD CURRENCIES, WE'LL JUST UPDATE THEM USING .put
  // 3. Delete old currencies in idb
  this.openIndexedDB().then(db => {
      const tx = db.transaction('currencies', 'readwrite');
      tx.objectStore('currencies').iterateCursor(cursor => {
          if (!cursor) return;
          cursor.delete();
      });
      tx.complete.then(() => console.log('Deleted old currencies'));
  });
  */