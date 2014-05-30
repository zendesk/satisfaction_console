(function() {
  return {
    defaultState: 'loading',
    events: {
      'app.activated':'getDate',
      'click .submit':'loadChoices',
      'click .show_form': 'loadForm',
      //request events
      'getFilteredRatings.done':'parseSatRatings',
      'getAllRatings.done':'parseSatRatings'
    },
    requests: {
      getFilteredRatings: function(filter, next_page_url) {
        if (next_page_url) {
          return { url: next_page_url + '&score=' + filter };
        } else {
          return { url: '/api/v2/satisfaction_ratings.json?sort_order=desc&score=' + filter };
        }
        
      },
      //not strictly necessary
      getAllRatings: function(next_page_url) {
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
      this.filter = this.setting('Default Filter');
      var autoLoad = this.setting('Auto Load');
      this.daysBack = this.setting('Days Back');
      if (autoLoad===true) {
        this.loadRatings(this.filter);
      } else{
        this.loadForm();
      }
    },
    loadForm: function(e) {
      if (e) { e.preventDefault(); }
      this.switchTo('form', {
        daysBack: this.daysBack
      });
      this.$('#filter_select').val(this.filter);
    },
    loadChoices: function(e) {
      if (e) { e.preventDefault(); }
      this.filter = this.$('#filter_select').val();
      this.daysBack = this.$('#range').val();
      this.loadRatings(this.filter);
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
          this.filter = 'all';
          //console.log("Loading next page of ratings...\n ...w/o a filter");
          this.ajax('getAllRatings', next_page_url);
        } else {
          this.filter = 'all';
          //console.log("Loading ratings...\n ...w/o a filter");
          this.ajax('getAllRatings');
        }
      }
    },
    parseSatRatings: function(data) {
      var ratings = data.satisfaction_ratings;
      if(data.count === 0) {
        services.notify('No ratings pass that filter.', 'error');
        this.loadForm();
        return;
      }
      this.startDate = this.dateMs - (this.daysBack * 86400000);
      //check the date of the last rating on the page
      this.lastRatingMs = Date.parse(ratings[ratings.length - 1].created_at);
      if (data.previous_page===null && data.next_page) {
        // if this is the first of multiple pages
        // set the global ratings to the results
        this.ratings = ratings;
        // load the next page
        this.loadRatings(this.filter, data.next_page);
      } else if (data.previous_page && data.next_page && this.lastRatingMs > this.startDate) {
        // if this is not the first page, there is another page, and the last rating on this page is more recent than the startDate
        // set the global ratings to the existing set concantenated to the results
        this.ratings = this.ratings.concat(ratings);
        // load the next page
        this.loadRatings(this.filter, data.next_page);
      } else if (data.previous_page===null && data.next_page===null) {
        // if there is only one page of results
        this.ratings = ratings;
        // move to the next step
        this.encodeRatings();
      } else {
        // if this is the last of multiple pages (in range)
        this.ratings = this.ratings.concat(ratings);
        // move to the next step
        this.encodeRatings();
      }
    },
    encodeRatings: function() {
      var n = 0,
        ratingMs = Date.now();
        //console.log("Now: " + ratingMs);
      this.user_i = 0;
      // this.unencoded = [];
      this.encoded = [];

      // try a more efficient way to filter by date
      // console.log(this.ratings);
      // console.log(Date.parse(this.ratings[0].created_at));
      // console.log(this.startDate);
      var start_date = this.startDate;
      this.unencoded = _.filter(this.ratings, function(rating){
        var created_date = Date.parse(rating.created_at);
        return created_date > start_date;
      });
      // console.log(this.unencoded);
      if(!this.unencoded[0]) {
        services.notify('No ratings in range.', 'error');
        this.loadForm();
        return;
      }
      _.each(this.unencoded, function(rating, n) {
      // massage the data...
        // format date
        rating.created_at = new Date(rating.created_at);
        rating.created_at = rating.created_at.toLocaleDateString();
        
        //add thumb
        if(rating.score == 'good') {
          rating.thumb = '<i class="icon-thumbs-up"></i>';
          rating.score_label = helpers.fmt("<span class='label label-success'>%@</span>", rating.score);
        } else if (rating.score == 'bad') {
          rating.thumb = '<i class="icon-thumbs-down"></i>';
          rating.score_label = helpers.fmt("<span class='label label-important'>%@</span>", rating.score);
        }
        // encode ratings in range
        this.encoded[n] = {
          ticket_id: encodeURIComponent(rating.ticket_id),
          score: encodeURIComponent(rating.score),
          organization_id: encodeURIComponent(rating.organization_id),
          assignee_id: encodeURIComponent(rating.assignee_id),
          created_at: encodeURIComponent(rating.created_at),
          comment: encodeURIComponent(rating.comment)
        };
        if (rating.assignee_id) {
          this.ajax('getUser', rating.assignee_id, n, 'assignee');
        } else {
          this.user_i++;
          this.endLoop(n);
        }
      }.bind(this));
      return;
    },
    addUserName: function(data, n, role) {
      this.user_i++;
      var user = data.user,
        userName = user.name;
      this.unencoded[n].assignee = userName;
      this.encoded[n].assignee = encodeURIComponent(userName);
      this.endLoop(n);
    },
    endLoop: function(n) {
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
