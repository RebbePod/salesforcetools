javascript:(function(){ 
    let currentPrefix = window.location.origin; 
    let userLink = prompt("Enter the package installation link:"); 
    if (userLink) { 
        let updatedLink = userLink.replace(/^https?:\/\/[^\/]+/, currentPrefix); 
        window.open(updatedLink, '_blank'); 
    } 
})();
