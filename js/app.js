var CLIENT_ID = 'EGAVPCRPG4YXFXNAPIH5NDDTO4MVF0ZPPGLGQZJIDQA35GQD';
var CLIENT_SECRET = 'KL1YIQMRLWDA4BK2IPVVTRROTRBPACVYPA4LXLBEDTQ5VBLD';
var fourSquareUrl = 'https://api.foursquare.com/v2/venues/explore?ll=28.613939,77.209021'+ '&client_id=' + CLIENT_ID + '&client_secret=' + CLIENT_SECRET + '&v=20170216&m=foursquare&query=cafe';
//model
var Cafe = function(data) {
    var cafe = this;
    cafe.id = ko.observable(data.venue.id);
    cafe.name = ko.observable(data.venue.name);
    cafe.lat = ko.observable(data.venue.location.lat);
    cafe.lng = ko.observable(data.venue.location.lng);
    cafe.description = ko.observable('');
    cafe.phone = ko.observable('');
    cafe.rating = ko.observable('N/A');
    cafe.canonicalUrl = ko.observable('');
    // address elements as not many venues have formatted address
    cafe.address1 = ko.observable();
    cafe.address2 = ko.observable();
    cafe.address = ko.computed(function() {
        return cafe.address1() + ', ' + cafe.address2() ;
    });

    cafe.photoPrefix = ko.observable();
    cafe.photoSuffix = ko.observable();
    cafe.image = ko.computed(function() {
        return cafe.photoPrefix() + '200x200' + cafe.photoSuffix();
    });
    // google maps marker and infowindow content
    cafe.marker = ko.observable();
    cafe.infowindowContent = ko.computed(function() {
        var content = '<div id="iw-container">' +
                                '<div class="iw-title">' + cafe.name() + '</div>' +
                                '<div class="iw-content">' +
                                    '<div class="iw-subTitle">Cafe Information using Foursquare</div>' +
                                    '<img src="' + cafe.photoPrefix() + '200x200' + cafe.photoSuffix() + '" alt="Cafe Photo">' +
                                    '<p>' + cafe.phone() + '</p>' +
                                    '<p>' + cafe.address() + '</p>' +
                                    '<p>' + cafe.description() + '</p>' +
                                    '<p>Rating: ' + cafe.rating() + '</p>' +
                                    '<p><a target="_blank" href=' + cafe.canonicalUrl() + '>More Information</a></p>' +
                                '</div>' +
                            '</div>';
        return content;
    });
};
//viewmodel
var ViewModel = function() {
    var self = this;

    // Create initial observable array of attractions
    self.cafeList = ko.observableArray([]);
    // retrieve data from google
    $.getJSON(fourSquareUrl, function(data) {
        cafesFromFoursquare = data.response.groups[0].items;
    })
    .done(function() {
        cafesFromFoursquare.forEach(function(cafe) {
            self.cafeList.push(new Cafe(cafe));
        });
        var marker;
        self.cafeList().forEach(function(cafe) {
            // get detailed foursquare info
            var venueUrl = 'https://api.foursquare.com/v2/venues/' + cafe.id() + '?client_id=' + CLIENT_ID + '&client_secret=' + CLIENT_SECRET + '&v=20170216&m=foursquare';
            $.getJSON(venueUrl, function(data) {
                cafeInfo = data.response.venue;
            })
            .done(function() {
                if(cafeInfo.contact.hasOwnProperty('formattedPhone')) {
                    cafe.phone(cafeInfo.contact.formattedPhone);
                }
                cafe.address1(cafeInfo.location.formattedAddress[0]);
                cafe.address2(cafeInfo.location.formattedAddress[1]);
                cafe.photoPrefix(cafeInfo.bestPhoto.prefix);
                cafe.photoSuffix(cafeInfo.bestPhoto.suffix);
                if(cafeInfo.hasOwnProperty('description')) {
                    cafe.description(cafeInfo.description);
                }
                if(cafeInfo.hasOwnProperty('rating')) {
                    cafe.rating(cafeInfo.rating);
                }
                if(cafeInfo.hasOwnProperty('canonicalUrl')) {
                    cafe.canonicalUrl(cafeInfo.canonicalUrl);
                }
            })
            .fail(function() {
                logError("Error Loading Venue Detail from FourSquare");
            })
            .always(function(){
                // add google pin marker to map for each Cafe
                marker = new google.maps.Marker({
                    position: new google.maps.LatLng(cafe.lat(), cafe.lng()),
                    map: map,
                    animation: google.maps.Animation.DROP
                });

                cafe.marker(marker);
                // add animation to markers when clicked
                google.maps.event.addListener(cafe.marker(), 'click', function() {
                    map.panTo(cafe.marker().getPosition());
                    cafe.marker().setAnimation(google.maps.Animation.BOUNCE);
                    setTimeout(function() {
                        cafe.marker().setAnimation(null);
                    }, 1000);
                    infowindow.setContent(cafe.infowindowContent());
                    infowindow.open(map, this);
                });
                // push all restaurants out to filteredRestaurant array for initial load
                self.CafeFilter.push(cafe);
            });
        });
    })
    .fail(function() {
        logError("Error!!!! Couldn't Load data from Foursquare!!");
    });

    // function to simulate clicking on marker when item clicked in list
    self.CafeSelect = function(cafe) {
        google.maps.event.trigger(cafe.marker(), 'click');
        // collapse sidebar after selection for mobile devices
        $('.navbar-collapse').collapse('toggle');
    };

    // set up search functionality
    self.query = ko.observable();
    self.CafeFilter = ko.observableArray();

    // function to update cafeList when user enters a search
    self.runFilter = function() {
        var filter = self.query().toLowerCase();
        self.CafeFilter.removeAll();
        self.cafeList().forEach(function(cafe) {
            cafe.marker().setVisible(false);
            if(cafe.name().toLowerCase().indexOf(filter) >= 0) {
                self.CafeFilter.push(cafe);
            }
        });
        self.CafeFilter().forEach(function(cafe) {
            cafe.marker().setVisible(true);
        });
    };
    // subscribe the search query to the runFilter function
    self.query.subscribe(self.runFilter);

    //Error Handling
    self.errorMessage = ko.observable();

    function logError(message) {
        self.errorMessage(message);
    }
};

// VIEW MODEL
var map;
function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: {lat: 28.613939, lng: 77.209021},
        zoom: 14
    });
    infowindow = new google.maps.InfoWindow();

    var vm = new ViewModel();
    ko.applyBindings(vm);
}

function mapError() {
    var $error = $('#error');
    $error.addClass('show-error');
    $error.html("Error!!!! Couldn't fetch Google Maps");
}

