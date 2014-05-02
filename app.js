(function() {
  return {
    defaultState: 'loading',
    events: {
      'app.activated':'getDate',
      'click .submit':'loadChoices',
      'click .show_form': function(e) {
        if (e) { e.preventDefault(); }
        this.switchTo('form');
      },
      //request events
      'getFilteredRatings.done':'parseSatRatings',
      'getAllRatings.done':'parseSatRatings'
    },
    requests: {
      getFilteredRatings: function(filter, next_page_url) {
        if (next_page_url) {
          return { url: next_page_url + '&score=' + filter };
        } else {
          return { url: '/api/v2/satisfaction_ratings.json?&sort_order=desc&score=' + filter };
        }
        
      },
      //not strictly necessary
      getAllRatings: function(filter, next_page_url) {
        if (next_page_url) {
          return { url: next_page_url };
        } else {
          return { url: '/api/v2/satisfaction_ratings.json?sort_order=desc' };
        }
      },
      getUser: function(id, n, role) {
        return {
          url: '/api/v2/users/' + id + '.json',
          role: 'assignee',
          success: function(data){this.addUserName(data, n, role);}
        };
      },
      getOrg: function(id, n) {
        return {
          url: '/api/v2/organizations/' + id + '.json',
          success: function(data){this.addOrgName(data, n);}
        };
      }
    },
    //NAMED FUNCTIONS
    getDate: function() {
      var t = new Date();
      var d = t.getDate();
      var m = t.getMonth()+1;
      var y = t.getFullYear();
      if (d < 10){
        d = '0' + d;
      }
      if(m < 10){
        m = '0' + m;
      }
      this.datePretty = m + '/' + d + '/' + y;
      this.dateMs = Date.now();
      //console.log("1. Get the Date: " + this.dateMs);
      this.loadSettings();
    },
    loadSettings: function() {
      var filter = this.setting('Default Filter'),
          autoLoad = this.setting('Auto Load');
      this.daysBack = this.setting('Days Back');
      if (autoLoad===true) {
        this.loadRatings(filter);
      } else{
        this.switchTo('form');
      }
    },
    loadChoices: function(e) {
      if (e) { e.preventDefault(); }
      var filter = this.$('#filter_select').val();
      this.daysBack = this.$('#range').val();
      this.loadRatings(filter);
      this.switchTo('loading');
    },
    loadRatings: function(filter, next_page_url) {
      if (filter == 'received' || filter == 'received_with_comment' || filter == 'received_without_comment' || filter == 'good' || filter == 'good_with_comment' || filter == 'good_without_comment' || filter == 'bad' || filter == 'bad_with_comment' || filter == 'bad_without_comment') {
        this.filter = filter;
        if (next_page_url) {
          //console.log("Loading next page of ratings...\n ...w/ filter: " + filter + "\n  ...and url: " + next_page_url);
          this.ajax('getFilteredRatings', filter, next_page_url);
        } else {
          //console.log("Loading ratings...\n ...w/ filter: " + filter + "\n  ...and no url(?) " + next_page_url);
          this.ajax('getFilteredRatings', filter);
        }
        //this conditional isn't stricly necessary. it restricts the parameter value,
        // but so does the API and it doesn't complain. plus the UI restricts it.
      } else{
        if (next_page_url) {
          this.filter = 'none';
          //console.log("Loading next page of ratings...\n ...w/o a filter");
          this.ajax('getAllRatings', next_page_url);
        } else {
          this.filter = 'none';
          //console.log("Loading ratings...\n ...w/o a filter");
          this.ajax('getAllRatings');
        }
      }
    },
    parseSatRatings: function(data) {
      var ratings = data.satisfaction_ratings;
      this.startDate = this.dateMs - (this.daysBack * 86400000);
      //check the date of the last rating on the page
      this.lastRatingMs = Date.parse(ratings[ratings.length - 1].created_at);
      //console.log(this.lastRatingMs);
      if (data.previous_page===null && data.next_page) {
        this.ratings = ratings;
        this.loadRatings(this.filter, data.next_page);
      } else if (data.previous_page && data.next_page && this.lastRatingMs > this.startDate) {
        this.ratings = this.ratings.concat(ratings);
        this.loadRatings(this.filter, data.next_page);
      } else if (data.previous_page===null && data.next_page===null) {
        this.ratings = ratings;
        this.encodeRatings();
      } else {
        this.ratings = this.ratings.concat(ratings);
        //console.log("Stopping load at a last rating of " + this.lastRatingMs + " ms \/ " + this.startDate + " start date");
        this.encodeRatings();
      }
    },
    encodeRatings: function() {
      var n = 0,
        ratingMs = Date.now();
        //console.log("Now: " + ratingMs);
      this.user_i = 0;
      this.unencoded = [];
      this.encoded = [];

      // try a more efficient way to filter by date
      // console.log(this.ratings);
      // console.log(Date.parse(this.ratings[0].created_at));
      // console.log(this.startDate);
      // var start_date = this.startDate;
      // var ratingsInRange = _.filter(this.ratings, function(rating){
      //   var created_date = Date.parse(rating.created_at);
      //   return created_date > start_date;
      // });
      // // console.log(ratingsInRange);

      // _.each(ratingsInRange, function(rating) {
      //   // format date
      //   rating.created_at = new Date(rating.created_at);
      //   rating.created_at = rating.created_at.toLocaleDateString();
        

      // });





      // the old way
      while (ratingMs > this.startDate) {
        // add ratings in range
        this.unencoded[n] = this.ratings[n];
        // console.log('rating ' + n + ' in range');
        // console.log(this.unencoded[n]);

        //format date
        var locale_string = new Date(this.ratings[n].created_at);
        this.unencoded[n].created_at = locale_string.toLocaleDateString();

        //add thumb
        if(this.ratings[n].score == 'good') {
          this.unencoded[n].thumb = '<i class="icon-thumbs-up"></i>';
          this.unencoded[n].score_label = helpers.fmt("<span class='label label-success'>%@</span>", this.unencoded[n].score);
        } else if (this.ratings[n].score == 'bad') {
          this.unencoded[n].thumb = '<i class="icon-thumbs-down"></i>';
          this.unencoded[n].score_label = helpers.fmt("<span class='label label-important'>%@</span>", this.unencoded[n].score);
        }
        // encode ratings in range
        this.encoded[n] = {
          ticket_id: encodeURIComponent(this.ratings[n].ticket_id),
          score: encodeURIComponent(this.ratings[n].score),
          organization_id: encodeURIComponent(this.ratings[n].organization_id),
          assignee_id: encodeURIComponent(this.ratings[n].assignee_id),
          created_at: encodeURIComponent(this.ratings[n].created_at),
          comment: encodeURIComponent(this.ratings[n].comment)
        };
        if (this.ratings[n].assignee_id) {
          this.ajax('getUser', this.ratings[n].assignee_id, n, 'assignee');
        } else {
          this.user_i++;
          // bug fix?
          if(this.user_i == this.unencoded.length) {
            services.notify('No ratings in range.', 'error');
            this.switchTo('form');

          }
        }
        //this.ajax('getOrg', this.ratings[n].organization_id, n);
        ratingMs = Date.parse(this.ratings[n].created_at);
        //console.log("Next one created at: " + this.ratings[n].created_at + ", " + ratingMs);
        n++;
      }
      // this.switchTo('csv', {
      //   ratings: this.unencoded,
      //   encoded_ratings: this.encoded,
      //   filter: this.filter,
      //   daysBack: this.daysBack
      // });
      
    },
    addUserName: function(data, n, role) {
      this.user_i++;
      var user = data.user,
        userName = user.name;
        // console.log(userName);
        this.unencoded[n].assignee = userName;
        this.encoded[n].assignee = encodeURIComponent(userName);
        //this.unencoded[n].requester = userName;
        //this.encoded[n].requester = encodeURIComponent(userName);
      if(this.user_i == this.unencoded.length) {
        this.switchTo('csv', {
          ratings: this.unencoded,
          encoded_ratings: this.encoded,
          filter: this.filter,
          daysBack: this.daysBack
        });
      }
    },
    // addOrgName: function(data, n) {
    //   var org = data.organization;
    //     orgName = org.name;
    //     this.unencoded[n].organization = orgName;
    //     this.encoded[n].organization = encodeURIComponent(orgName);
    //   this.switchTo('csv', {
    //     ratings: this.unencoded,
    //     encoded_ratings: this.encoded,
    //     filter: this.filter,
    //     daysBack: this.daysBack
    //   });
    // }
  };

}());
