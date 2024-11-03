javascript: (function() {
    window.indexedDB.databases().then(function(dbs) {
        dbs.forEach(db => {
            window.indexedDB.deleteDatabase(db.name);
        });
    }).then(function() {
        location.reload();
    });
})();