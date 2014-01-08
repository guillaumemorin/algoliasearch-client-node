/*
 * Copyright (c) 2013 Algolia
 * http://www.algolia.com/
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var _ = require('underscore');
var https = require('https');
var Buffers = require('buffers');

/**
 * Algolia Search library initialization
 * @param applicationID the application ID you have in your admin interface
 * @param apiKey a valid API key for the service
 * @param hostsArray the list of hosts that you have received for the service
 * @param httpsAgent (optional) an agent to pass to https service (can be agentkeepalive module to minimize latency)
 */
var AlgoliaSearch = function(applicationID, apiKey, httpsAgent, hostsArray) {
    this.applicationID = applicationID;
    this.apiKey = apiKey;
    if (_.isUndefined(hostsArray)) {
        hostsArray = [applicationID + '-1.algolia.io',
                      applicationID + '-2.algolia.io',
                      applicationID + '-3.algolia.io'];
    }

    // Add hosts in random order
    for (var i = 0; i < hostsArray.length; ++i) {
        if (Math.random() > 0.5) {
            this.hosts.reverse();
        }
        this.hosts.push(hostsArray[i]);
    }
    if (Math.random() > 0.5) {
        this.hosts.reverse();
    }
    this.httpsAgent = _.isUndefined(httpsAgent) ? null : httpsAgent;
    this.disableRateLimitForward();
};

AlgoliaSearch.prototype = {
    /*
     * Delete an index
     *
     * @param indexName the name of index to delete
     * @param callback the result callback with two arguments
     *  error: boolean set to true if the request had an error
     *  content: the server answer that contains the task ID
     */
    deleteIndex: function(indexName, callback) {
        var indexObj = this;
        this._jsonRequest({ method: 'DELETE',
                            url: '/1/indexes/' + encodeURIComponent(indexName),
                            callback: function(error, res, body) {
            if (!_.isUndefined(callback)) {
                callback(error, body);
            }
        }});
    },
    /**
     * Move an existing index.
     * @param srcIndexName the name of index to copy.
     * @param dstIndexName the new index name that will contains a copy of srcIndexName (destination will be overriten if it already exist).
     * @param callback the result callback with two arguments
     *  error: boolean set to true if the request had an error
     *  content: the server answer with index list or error description if error is true.
     */
    moveIndex: function(srcIndexName, dstIndexName, callback) {
        var postObj = {operation: 'move', destination: dstIndexName};
        var indexObj = this;
        this._jsonRequest({ method: 'POST',
                            url: '/1/indexes/' + encodeURIComponent(srcIndexName) + '/operation',
                            body: postObj,
                            callback: function(error, res, body) {
            if (!_.isUndefined(callback)) {
                callback(error, body);
            }
        }});
    },
    /**
     * Copy an existing index.
     * @param srcIndexName the name of index to copy.
     * @param dstIndexName the new index name that will contains a copy of srcIndexName (destination will be overriten if it already exist).
     * @param callback the result callback with two arguments
     *  error: boolean set to true if the request had an error
     *  content: the server answer with index list or error description if error is true.
     */
    copyIndex: function(srcIndexName, dstIndexName, callback) {
        var postObj = {operation: 'copy', destination: dstIndexName};
        var indexObj = this;
        this._jsonRequest({ method: 'POST',
                            url: '/1/indexes/' + encodeURIComponent(srcIndexName) + '/operation',
                            body: postObj,
                            callback: function(error, res, body) {
            if (!_.isUndefined(callback)) {
                callback(error, body);
            }
        }});
    },
    /**
     * Return last log entries.
     * @param offset Specify the first entry to retrieve (0-based, 0 is the most recent log entry).
     * @param length Specify the maximum number of entries to retrieve starting at offset. Maximum allowed value: 1000.
     * @param callback the result callback with two arguments
     *  error: boolean set to true if the request had an error
     *  content: the server answer with index list or error description if error is true.
     */
    getLogs: function(callback, offset, length) {
        var indexObj = this;
        if (_.isUndefined(offset)) {
            offset = 0;
        }
        if (_.isUndefined(length)) {
            length = 10;
        }

        this._jsonRequest({ method: 'GET',
                            url: '/1/logs?offset=' + offset + '&length=' + length,
                            callback: function(error, res, body) {
            if (!_.isUndefined(callback)) {
                callback(error, body);
            }
        }});
    },
    /*
     * List all existing indexes
     *
     * @param callback the result callback with two arguments
     *  error: boolean set to true if the request had an error
     *  content: the server answer with index list or error description if error is true.
     */
    listIndexes: function(callback) {
        var indexObj = this;
        this._jsonRequest({ method: 'GET',
                            url: '/1/indexes/',
                            callback: function(error, res, body) {
            if (!_.isUndefined(callback)) {
                callback(error, body);
            }
        }});
    },
    /*
     * Get the index object initialized
     *
     * @param indexName the name of index
     * @param callback the result callback with one argument (the Index instance)
     */
    initIndex: function(indexName) {
        return new this.Index(this, indexName);
    },
    /*
     * List all existing user keys with their associated ACLs
     *
     * @param callback the result callback with two arguments
     *  error: boolean set to true if the request had an error
     *  content: the server answer with user keys list or error description if error is true.
     */
    listUserKeys: function(callback) {
        var indexObj = this;
        this._jsonRequest({ method: 'GET',
                            url: '/1/keys',
                            callback: function(error, res, body) {
            if (!_.isUndefined(callback)) {
                callback(error, body);
            }
        }});
    },
    /*
     * Get ACL of a user key
     *
     * @param callback the result callback with two arguments
     *  error: boolean set to true if the request had an error
     *  content: the server answer with user keys list or error description if error is true.
     */
    getUserKeyACL: function(key, callback) {
        var indexObj = this;
        this._jsonRequest({ method: 'GET',
                            url: '/1/keys/' + key,
                            callback: function(error, res, body) {
            if (!_.isUndefined(callback)) {
                callback(error, body);
            }
        }});
    },
    /*
     * Delete an existing user key
     *
     * @param callback the result callback with two arguments
     *  error: boolean set to true if the request had an error
     *  content: the server answer with user keys list or error description if error is true.
     */
    deleteUserKey: function(key, callback) {
        var indexObj = this;
        this._jsonRequest({ method: 'DELETE',
                            url: '/1/keys/' + key,
                            callback: function(error, res, body) {
            if (!_.isUndefined(callback)) {
                callback(error, body);
            }
        }});
    },
    /*
     * Add an existing user key
     *
     * @param acls the list of ACL for this key. Defined by an array of strings that
     * can contains the following values:
     *   - search: allow to search (https and http)
     *   - addObject: allows to add/update an object in the index (https only)
     *   - deleteObject : allows to delete an existing object (https only)
     *   - deleteIndex : allows to delete index content (https only)
     *   - settings : allows to get index settings (https only)
     *   - editSettings : allows to change index settings (https only)
     * @param callback the result callback with two arguments
     *  error: boolean set to true if the request had an error
     *  content: the server answer with user keys list or error description if error is true.
     */
    addUserKey: function(acls, callback) {
        var aclsObject = {};
        aclsObject.acl = acls;
        this._addUserKey(aclsObject, callback);
    },
    /*
     * Add an existing user key
     *
     * @param acls the list of ACL for this key. Defined by an array of strings that
     * can contains the following values:
     *   - search: allow to search (https and http)
     *   - addObject: allows to add/update an object in the index (https only)
     *   - deleteObject : allows to delete an existing object (https only)
     *   - deleteIndex : allows to delete index content (https only)
     *   - settings : allows to get index settings (https only)
     *   - editSettings : allows to change index settings (https only)
     * @param validity the number of seconds after which the key will be automatically removed (0 means no time limit for this key)
     * @param maxQueriesPerIPPerHour Specify the maximum number of API calls allowed from an IP address per hour. Defaults to 0 (no rate limit).
     * @param maxHitsPerQuery Specify the maximum number of hits this API key can retrieve in one call. Defaults to 0 (unlimited)
     * @param callback the result callback with two arguments
     *  error: boolean set to true if the request had an error
     *  content: the server answer with user keys list or error description if error is true.
     */
    addUserKeyWithValidity: function(acls, validity, maxQueriesPerIPPerHour, maxHitsPerQuery, callback) {
        var aclsObject = {};
        aclsObject.acl = acls;
        aclsObject.validity = validity;
        aclsObject.maxQueriesPerIPPerHour = maxQueriesPerIPPerHour;
        aclsObject.maxHitsPerQuery = maxHitsPerQuery;
        this._addUserKey(aclsObject, callback);
    },
    /*
     * Index class constructor.
     * You should not use this method directly but use initIndex() function
     */
    Index: function(algoliasearch, indexName) {
        this.indexName = indexName;
        this.as = algoliasearch;
    },

    /*
     * Allow to use IP rate limit when you have a proxy between end-user and Algolia.
     * This option will set the X-Forwarded-For HTTP header with the client IP and the X-Forwarded-API-Key with the API Key having rate limits.
     * @param adminAPIKey the admin API Key you can find in your dashboard
     * @param endUserIP the end user IP (you can use both IPV4 or IPV6 syntax)
     * @param rateLimitAPIKey the API key on which you have a rate limit
     */
    enableRateLimitForward: function(adminAPIKey, endUserIP, rateLimitAPIKey) {
        this.forwardAdminAPIKey = adminAPIKey;
        this.forwardEndUserIP = endUserIP;
        this.forwardLimitAPIKey = rateLimitAPIKey;
    },

    /*
     * Disable IP rate limit enabled with enableRateLimitForward() function
     */
    disableRateLimitForward: function() {
        this.forwardAdminAPIKey = null;
        this.forwardEndUserIP = null;
        this.forwardLimitAPIKey = null;
    },

    _addUserKey: function(aclsObject, callback) {
        var indexObj = this;
        this._jsonRequest({ method: 'POST',
                            url: '/1/keys',
                            body: aclsObject,
                            callback: function(error, res, body) {
            if (!_.isUndefined(callback)) {
                callback(error, body);
            }
        }});
    },
    /*
     * Wrapper that try all hosts to maximize the quality of service
     */
    _jsonRequest: function(opts) {
        var self = this;
        var callback = opts.callback;

        var impl = function(position) {
            var idx = 0;
            if (!_.isUndefined(position)) {
                idx = position;
            }
            if (!Array.isArray(self.hosts) || self.hosts.length <= idx) {
                callback(true, null, { message: 'Cannot contact server'});
                return;
            }
            opts.callback = function(retry, error, res, body) {
                if (error && !_.isUndefined(body)) {
                    console.log('Error: ' + body.message);
                }
                if (retry && error && (idx + 1) < self.hosts.length) {
                    impl(idx + 1);
                } else {
                    callback(error, res, body);
                }
            };
            opts.hostname = self.hosts[idx];
            self._jsonRequestByHost(opts);
        };
        impl();
    },
    _computeRequestOptions: function(opts, body) {
        var reqOpts = {
          method: opts.method,
          hostname: opts.hostname,
          port: 443,
          path: opts.url,
          headers: {
            'X-Algolia-Application-Id': this.applicationID,
            'X-Algolia-API-Key': this.apiKey,
            'Connection':'keep-alive',
            'Content-Length': 0,
            'User-Agent': 'Algolia for node.js'
          }
        };
        if (this.forwardAdminAPIKey !== null) {
            reqOpts.headers['X-Algolia-API-Key'] = this.forwardAdminAPIKey;
            reqOpts.headers['X-Forwarded-API-Key'] = this.forwardLimitAPIKey;
            reqOpts.headers['X-Forwarded-For'] = this.forwardEndUserIP;
        }

        if (opts.hostname.indexOf(':') !== -1) {
            var n = opts.hostname.split(':');
            reqOpts.hostname = n[0];
            reqOpts.port = n[1];
        }
        if (body != null) {
            reqOpts.headers = _.extend(reqOpts.headers, { 'Content-Type': 'application/json',
                                                          'Content-Length': new Buffer(body, 'utf8').length });
        }
        if (this.httpsAgent !== null) {
            reqOpts.agent = this.httpsAgent;
        }
        return reqOpts;
    },
    _jsonRequestByHost: function(opts) {
        var body = null;
        if (!_.isUndefined(opts.body)) {
            body = JSON.stringify(opts.body);
        }
        var reqOpts = this._computeRequestOptions(opts, body);

        var req = https.request(reqOpts, function(res) {
            var retry = res.statusCode === 0 || res.statusCode === 503;
            var success = (res.statusCode === 200 || res.statusCode === 201),
                chunks = new Buffers();

            res.on('data', function(chunk) {
                chunks.push(chunk);
            });

            res.on('end', function() {
                var body = chunks.toString('utf8');

                if (res && res.headers['content-type'].toLowerCase().indexOf('application/json') >= 0) {
                    body = JSON.parse(body);

                }
                opts.callback(retry, !success, res, body);
            });
        });
        req.on('error', function(e) {
            opts.callback(true, true, null, { 'message': e} );
        });

        if (body != null) {
            req.write(body, encoding = 'utf8');
        }
        req.end();
    },

    /// internal attributes
    applicationID: null,
    apiKey: null,
    httpsAgent: null,
    hosts: [],
    batch: []
};

/*
 * Contains all the functions related to one index
 * You should use AlgoliaSearch.initIndex(indexName) to retrieve this object
 */
AlgoliaSearch.prototype.Index.prototype = {
        /*
         * Add an object in this index
         *
         * @param content contains the javascript object to add inside the index
         * @param callback (optional) the result callback with two arguments:
         *  error: boolean set to true if the request had an error
         *  content: the server answer that contains 3 elements: createAt, taskId and objectID
         * @param objectID (optional) an objectID you want to attribute to this object
         * (if the attribute already exist the old object will be overwrite)
         */
        addObject: function(content, callback, objectID) {
            var indexObj = this;
            if (_.isUndefined(objectID)) {
                this.as._jsonRequest({ method: 'POST',
                                       url: '/1/indexes/' + encodeURIComponent(indexObj.indexName),
                                       body: content,
                                       callback: function(error, res, body) {
                    if (!_.isUndefined(callback)) {
                        callback(error, body);
                    }
                }});
            } else {
                this.as._jsonRequest({ method: 'PUT',
                                       url: '/1/indexes/' + encodeURIComponent(indexObj.indexName) + '/' + encodeURIComponent(objectID),
                                       body: content,
                                       callback: function(error, res, body) {
                    if (!_.isUndefined(callback)) {
                        callback(error, body);
                    }
                }});
            }

        },
        /*
         * Add several objects
         *
         * @param objects contains an array of objects to add
         * @param callback (optional) the result callback with two arguments:
         *  error: boolean set to true if the request had an error
         *  content: the server answer that updateAt and taskID
         */
        addObjects: function(objects, callback) {
            var indexObj = this;
            var postObj = {requests:[]};
            for (var i = 0; i < objects.length; ++i) {
                var request = { action: 'addObject',
                                body: objects[i] };
                postObj.requests.push(request);
            }
            this.as._jsonRequest({ method: 'POST',
                                   url: '/1/indexes/' + encodeURIComponent(indexObj.indexName) + '/batch',
                                   body: postObj,
                                   callback: function(error, res, body) {
                if (!_.isUndefined(callback)) {
                    callback(error, body);
                }
            }});
        },
        /*
         * Get an object from this index
         *
         * @param objectID the unique identifier of the object to retrieve
         * @param callback (optional) the result callback with two arguments
         *  error: boolean set to true if the request had an error
         *  content: the object to retrieve or the error message if a failure occured
         * @param ClassToDerive (optional) if set, hits will be an instance of this class
         * @param attributes (optional) if set, contains the array of attribute names to retrieve
         */
        getObject: function(objectID, callback, attributes, ClassToDerive) {
            var indexObj = this;
            var params = '';
            if (!_.isUndefined(attributes)) {
                params = '?attributes=';
                for (var i = 0; i < attributes.length; ++i) {
                    if (i !== 0) {
                        params += ',';
                    }
                    params += attributes[i];
                }
            }
            this.as._jsonRequest({ method: 'GET',
                                   url: '/1/indexes/' + encodeURIComponent(indexObj.indexName) + '/' + encodeURIComponent(objectID) + params,
                                   callback: function(error, res, body) {
            if (!_.isUndefined(ClassToDerive)) {
                    var obj = new ClassToDerive();
                    _.extend(obj, body);
                    body = obj;
                }
                if (!_.isUndefined(callback)) {
                    callback(error, body);
                }
            }});
        },

        /*
         * Update partially an object (only update attributes passed in argument)
         *
         * @param partialObject contains the javascript attributes to override, the
         *  object must contains an objectID attribute
         * @param callback (optional) the result callback with two arguments:
         *  error: boolean set to true if the request had an error
         *  content: the server answer that contains 3 elements: createAt, taskId and objectID
         */
        partialUpdateObject: function(partialObject, callback) {
            var indexObj = this;
            this.as._jsonRequest({ method: 'POST',
                                   url: '/1/indexes/' + encodeURIComponent(indexObj.indexName) + '/' + encodeURIComponent(partialObject.objectID) + '/partial',
                                   body: partialObject,
                                   callback: function(error, res, body) {
                if (!_.isUndefined(callback)) {
                    callback(error, body);
                }
            }});
        },

        /*
         * Partially Override the content of several objects
         *
         * @param objects contains an array of objects to update (each object must contains a objectID attribute)
         * @param callback (optional) the result callback with two arguments:
         *  error: boolean set to true if the request had an error
         *  content: the server answer that updateAt and taskID
         */
        partialUpdateObjects: function(objects, callback) {
            var indexObj = this;
            var postObj = {requests:[]};
            for (var i = 0; i < objects.length; ++i) {
                var request = { action: 'partialUpdateObject',
                                objectID: encodeURIComponent(objects[i].objectID),
                                body: objects[i] };
                postObj.requests.push(request);
            }
            this.as._jsonRequest({ method: 'POST',
                                   url: '/1/indexes/' + encodeURIComponent(indexObj.indexName) + '/batch',
                                   body: postObj,
                                   callback: function(error, res, body) {
                if (!_.isUndefined(callback)) {
                    callback(error, body);
                }
            }});
        },

        /*
         * Override the content of object
         *
         * @param object contains the javascript object to save, the object must contains an objectID attribute
         * @param callback (optional) the result callback with two arguments:
         *  error: boolean set to true if the request had an error
         *  content: the server answer that updateAt and taskID
         */
        saveObject: function(object, callback) {
            var indexObj = this;
            this.as._jsonRequest({ method: 'PUT',
                                   url: '/1/indexes/' + encodeURIComponent(indexObj.indexName) + '/' + encodeURIComponent(object.objectID),
                                   body: object,
                                   callback: function(error, res, body) {
                if (!_.isUndefined(callback)) {
                    callback(error, body);
                }
            }});
        },
        /*
         * Override the content of several objects
         *
         * @param objects contains an array of objects to update (each object must contains a objectID attribute)
         * @param callback (optional) the result callback with two arguments:
         *  error: boolean set to true if the request had an error
         *  content: the server answer that updateAt and taskID
         */
        saveObjects: function(objects, callback) {
            var indexObj = this;
            var postObj = {requests:[]};
            for (var i = 0; i < objects.length; ++i) {
                var request = { action: 'updateObject',
                                objectID: encodeURIComponent(objects[i].objectID),
                                body: objects[i] };
                postObj.requests.push(request);
            }
            this.as._jsonRequest({ method: 'POST',
                                   url: '/1/indexes/' + encodeURIComponent(indexObj.indexName) + '/batch',
                                   body: postObj,
                                   callback: function(error, res, body) {
                if (!_.isUndefined(callback)) {
                    callback(error, body);
                }
            }});
        },
        /*
         * Delete an object from the index
         *
         * @param objectID the unique identifier of object to delete
         * @param callback (optional) the result callback with two arguments:
         *  error: boolean set to true if the request had an error
         *  content: the server answer that contains 3 elements: createAt, taskId and objectID
         */
        deleteObject: function(objectID, callback) {
            if (objectID === null || objectID.length === 0) {
                callback(false, { message: 'empty objectID'});
                return;
            }

            var indexObj = this;
            this.as._jsonRequest({ method: 'DELETE',
                                   url: '/1/indexes/' + encodeURIComponent(indexObj.indexName) + '/' + encodeURIComponent(objectID),
                                   callback: function(error, res, body) {
                if (!_.isUndefined(callback)) {
                    callback(error, body);
                }
            }});
        },
        /*
         * Search inside the index
         *
         * @param query the full text query
         * @param callback the result callback with two arguments:
         *  error: boolean set to true if the request had an error
         *  content: the server answer that contains the list of results
         * @param ClassToDerive (optional) if set, hits will be an instance of this class
         * @param args (optional) if set, contains an object with query parameters:
         * - page: (integer) Pagination parameter used to select the page to retrieve.
         *                   Page is zero-based and defaults to 0. Thus, to retrieve the 10th page you need to set page=9
         * - hitsPerPage: (integer) Pagination parameter used to select the number of hits per page. Defaults to 20.
         * - attributesToRetrieve: a string that contains the list of object attributes you want to retrieve (let you minimize the answer size).
         *   Attributes are separated with a comma (for example "name,address").
         *   You can also use a string array encoding (for example ["name","address"]).
         *   By default, all attributes are retrieved. You can also use '*' to retrieve all values when an attributesToRetrieve setting is specified for your index.
         * - attributesToHighlight: a string that contains the list of attributes you want to highlight according to the query.
         *   Attributes are separated by a comma. You can also use a string array encoding (for example ["name","address"]).
         *   If an attribute has no match for the query, the raw value is returned. By default all indexed text attributes are highlighted.
         *   You can use `*` if you want to highlight all textual attributes. Numerical attributes are not highlighted.
         *   A matchLevel is returned for each highlighted attribute and can contain:
         *      - full: if all the query terms were found in the attribute,
         *      - partial: if only some of the query terms were found,
         *      - none: if none of the query terms were found.
         * - attributesToSnippet: a string that contains the list of attributes to snippet alongside the number of words to return (syntax is `attributeName:nbWords`).
         *    Attributes are separated by a comma (Example: attributesToSnippet=name:10,content:10).
         *    You can also use a string array encoding (Example: attributesToSnippet: ["name:10","content:10"]). By default no snippet is computed.
         * - minWordSizefor1Typo: the minimum number of characters in a query word to accept one typo in this word. Defaults to 3.
         * - minWordSizefor2Typos: the minimum number of characters in a query word to accept two typos in this word. Defaults to 7.
         * - getRankingInfo: if set to 1, the result hits will contain ranking information in _rankingInfo attribute.
         * - aroundLatLng: search for entries around a given latitude/longitude (specified as two floats separated by a comma).
         *   For example aroundLatLng=47.316669,5.016670).
         *   You can specify the maximum distance in meters with the aroundRadius parameter (in meters) and the precision for ranking with aroundPrecision
         *   (for example if you set aroundPrecision=100, two objects that are distant of less than 100m will be considered as identical for "geo" ranking parameter).
         *   At indexing, you should specify geoloc of an object with the _geoloc attribute (in the form {"_geoloc":{"lat":48.853409, "lng":2.348800}})
         * - insideBoundingBox: search entries inside a given area defined by the two extreme points of a rectangle (defined by 4 floats: p1Lat,p1Lng,p2Lat,p2Lng).
         *   For example insideBoundingBox=47.3165,4.9665,47.3424,5.0201).
         *   At indexing, you should specify geoloc of an object with the _geoloc attribute (in the form {"_geoloc":{"lat":48.853409, "lng":2.348800}})
         * - numericFilters: a string that contains the list of numeric filters you want to apply separated by a comma.
         *   The syntax of one filter is `attributeName` followed by `operand` followed by `value`. Supported operands are `<`, `<=`, `=`, `>` and `>=`.
         *   You can have multiple conditions on one attribute like for example numericFilters=price>100,price<1000.
         *   You can also use a string array encoding (for example numericFilters: ["price>100","price<1000"]).
         * - tagFilters: filter the query by a set of tags. You can AND tags by separating them by commas.
         *   To OR tags, you must add parentheses. For example, tags=tag1,(tag2,tag3) means tag1 AND (tag2 OR tag3).
         *   You can also use a string array encoding, for example tagFilters: ["tag1",["tag2","tag3"]] means tag1 AND (tag2 OR tag3).
         *   At indexing, tags should be added in the _tags** attribute of objects (for example {"_tags":["tag1","tag2"]}).
         * - facetFilters: filter the query by a list of facets.
         *   Facets are separated by commas and each facet is encoded as `attributeName:value`.
         *   For example: `facetFilters=category:Book,author:John%20Doe`.
         *   You can also use a string array encoding (for example `["category:Book","author:John%20Doe"]`).
         * - facets: List of object attributes that you want to use for faceting.
         *   Attributes are separated with a comma (for example `"category,author"` ).
         *   You can also use a JSON string array encoding (for example ["category","author"]).
         *   Only attributes that have been added in **attributesForFaceting** index setting can be used in this parameter.
         *   You can also use `*` to perform faceting on all attributes specified in **attributesForFaceting**.
         * - queryType: select how the query words are interpreted, it can be one of the following value:
         *    - prefixAll: all query words are interpreted as prefixes,
         *    - prefixLast: only the last word is interpreted as a prefix (default behavior),
         *    - prefixNone: no query word is interpreted as a prefix. This option is not recommended.
         * - optionalWords: a string that contains the list of words that should be considered as optional when found in the query.
         *   The list of words is comma separated.
         * - distinct: If set to 1, enable the distinct feature (disabled by default) if the attributeForDistinct index setting is set.
         *   This feature is similar to the SQL "distinct" keyword: when enabled in a query with the distinct=1 parameter,
         *   all hits containing a duplicate value for the attributeForDistinct attribute are removed from results.
         *   For example, if the chosen attribute is show_name and several hits have the same value for show_name, then only the best
         *   one is kept and others are removed.
         */
        search: function(query, callback, args, ClassToDerive) {
            var indexObj = this;
            var params = '?query=' + encodeURIComponent(query);
            if (!_.isUndefined(args)) {
                params = this._getSearchParams(args, params);
            }
            this.as._jsonRequest({ method: 'GET',
                                   url: '/1/indexes/' + encodeURIComponent(indexObj.indexName) + params,
                                   callback: function(error, res, body) {
                if (!error && !_.isUndefined(ClassToDerive)) {
                    for (var i in body.hits) {
                        var obj = new ClassToDerive();
                        _.extend(obj, body.hits[i]);
                        body.hits[i] = obj;
                    }
                }
                if (!_.isUndefined(callback)) {
                    callback(error, body);
                }
            }});
        },

        /*
         * Browse all index content
         *
         * @param page Pagination parameter used to select the page to retrieve.
         *             Page is zero-based and defaults to 0. Thus, to retrieve the 10th page you need to set page=9
         * @param hitsPerPage: Pagination parameter used to select the number of hits per page. Defaults to 1000.
         */
        browse: function(page, callback, hitsPerPage, ClassToDerive) {
            var indexObj = this;
            var params = '?page=' + page;
            if (!_.isUndefined(hitsPerPage)) {
                params += '&hitsPerPage=' + hitsPerPage;
            }
            this.as._jsonRequest({ method: 'GET',
                                   url: '/1/indexes/' + encodeURIComponent(indexObj.indexName) + '/browse' + params,
                                   callback: function(error, res, body) {
                if (!error && !_.isUndefined(ClassToDerive)) {
                    for (var i in body.hits) {
                        var obj = new ClassToDerive();
                        _.extend(obj, body.hits[i]);
                        body.hits[i] = obj;
                    }
                }
                if (!_.isUndefined(callback)) {
                    callback(error, body);
                }
            }});
        },

        /*
         * Wait the publication of a task on the server.
         * All server task are asynchronous and you can check with this method that the task is published.
         *
         * @param taskID the id of the task returned by server
         * @param callback the result callback with with two arguments:
         *  error: boolean set to true if the request had an error
         *  content: the server answer that contains the list of results
         */
        waitTask: function(taskID, callback) {
            var indexObj = this;
            this.as._jsonRequest({ method: 'GET',
                                   url: '/1/indexes/' + encodeURIComponent(indexObj.indexName) + '/task/' + taskID,
                                   callback: function(error, res, body) {
                if (!error && body.status === 'published') {
                    callback(false, body);
                } else if (!error && body.pendingTask) {
                    return indexObj.waitTask(taskID, callback);
                } else {
                    callback(true, body);
                }
            }});
        },

        /*
         * Get settings of this index
         *
         * @param callback (optional) the result callback with two arguments
         *  error: boolean set to true if the request had an error
         *  content: the settings object or the error message if a failure occured
         */
        getSettings: function(callback) {
            var indexObj = this;
            this.as._jsonRequest({ method: 'GET',
                                   url: '/1/indexes/' + encodeURIComponent(indexObj.indexName) + '/settings',
                                   callback: function(error, res, body) {
                if (!_.isUndefined(callback)) {
                    callback(error, body);
                }
            }});
        },

        /*
         * This function deletes the index content. Settings and index specific API keys are kept untouched.
         *
         * @param callback (optional) the result callback with two arguments
         *  error: boolean set to true if the request had an error
         *  content: the settings object or the error message if a failure occured
         */
        clearIndex: function(callback) {
            var indexObj = this;
            this.as._jsonRequest({ method: 'POST',
                                   url: '/1/indexes/' + encodeURIComponent(indexObj.indexName) + '/clear',
                                   callback: function(error, res, body) {
                if (!_.isUndefined(callback)) {
                    callback(error, body);
                }
            }});
        },

        /*
         * Set settings for this index
         *
         * @param settigns the settings object that can contains :
         * - minWordSizefor1Typo: (integer) the minimum number of characters to accept one typo (default = 3).
         * - minWordSizefor2Typos: (integer) the minimum number of characters to accept two typos (default = 7).
         * - hitsPerPage: (integer) the number of hits per page (default = 10).
         * - attributesToRetrieve: (array of strings) default list of attributes to retrieve in objects.
         *   If set to null, all attributes are retrieved.
         * - attributesToHighlight: (array of strings) default list of attributes to highlight.
         *   If set to null, all indexed attributes are highlighted.
         * - attributesToSnippet**: (array of strings) default list of attributes to snippet alongside the number of words to return (syntax is attributeName:nbWords).
         *   By default no snippet is computed. If set to null, no snippet is computed.
         * - attributesToIndex: (array of strings) the list of fields you want to index.
         *   If set to null, all textual and numerical attributes of your objects are indexed, but you should update it to get optimal results.
         *   This parameter has two important uses:
         *     - Limit the attributes to index: For example if you store a binary image in base64, you want to store it and be able to
         *       retrieve it but you don't want to search in the base64 string.
         *     - Control part of the ranking*: (see the ranking parameter for full explanation) Matches in attributes at the beginning of
         *       the list will be considered more important than matches in attributes further down the list.
         *       In one attribute, matching text at the beginning of the attribute will be considered more important than text after, you can disable
         *       this behavior if you add your attribute inside `unordered(AttributeName)`, for example attributesToIndex: ["title", "unordered(text)"].
         * - attributesForFaceting: (array of strings) The list of fields you want to use for faceting.
         *   All strings in the attribute selected for faceting are extracted and added as a facet. If set to null, no attribute is used for faceting.
         * - attributeForDistinct: (string) The attribute name used for the Distinct feature. This feature is similar to the SQL "distinct" keyword: when enabled
         *   in query with the distinct=1 parameter, all hits containing a duplicate value for this attribute are removed from results.
         *   For example, if the chosen attribute is show_name and several hits have the same value for show_name, then only the best one is kept and others are removed.
         * - ranking: (array of strings) controls the way results are sorted.
         *   We have six available criteria:
         *    - typo: sort according to number of typos,
         *    - geo: sort according to decreassing distance when performing a geo-location based search,
         *    - proximity: sort according to the proximity of query words in hits,
         *    - attribute: sort according to the order of attributes defined by attributesToIndex,
         *    - exact:
         *        - if the user query contains one word: sort objects having an attribute that is exactly the query word before others.
         *          For example if you search for the "V" TV show, you want to find it with the "V" query and avoid to have all popular TV
         *          show starting by the v letter before it.
         *        - if the user query contains multiple words: sort according to the number of words that matched exactly (and not as a prefix).
         *    - custom: sort according to a user defined formula set in **customRanking** attribute.
         *   The standard order is ["typo", "geo", "proximity", "attribute", "exact", "custom"]
         * - customRanking: (array of strings) lets you specify part of the ranking.
         *   The syntax of this condition is an array of strings containing attributes prefixed by asc (ascending order) or desc (descending order) operator.
         *   For example `"customRanking" => ["desc(population)", "asc(name)"]`
         * - queryType: Select how the query words are interpreted, it can be one of the following value:
         *   - prefixAll: all query words are interpreted as prefixes,
         *   - prefixLast: only the last word is interpreted as a prefix (default behavior),
         *   - prefixNone: no query word is interpreted as a prefix. This option is not recommended.
         * - highlightPreTag: (string) Specify the string that is inserted before the highlighted parts in the query result (default to "<em>").
         * - highlightPostTag: (string) Specify the string that is inserted after the highlighted parts in the query result (default to "</em>").
         * - optionalWords: (array of strings) Specify a list of words that should be considered as optional when found in the query.
         * @param callback (optional) the result callback with two arguments
         *  error: boolean set to true if the request had an error
         *  content: the server answer or the error message if a failure occured
         */
        setSettings: function(settings, callback) {
            var indexObj = this;
            this.as._jsonRequest({ method: 'PUT',
                                   url: '/1/indexes/' + encodeURIComponent(indexObj.indexName) + '/settings',
                                   body: settings,
                                   callback: function(error, res, body) {
                if (!_.isUndefined(callback)) {
                    callback(error, body);
                }
            }});
        },
        /*
         * List all existing user keys associated to this index
         *
         * @param callback the result callback with two arguments
         *  error: boolean set to true if the request had an error
         *  content: the server answer with user keys list or error description if error is true.
         */
        listUserKeys: function(callback) {
            var indexObj = this;
            this.as._jsonRequest({ method: 'GET',
                                   url: '/1/indexes/' + encodeURIComponent(indexObj.indexName) + '/keys',
                                   callback: function(error, res, body) {
                if (!_.isUndefined(callback)) {
                    callback(error, body);
                }
            }});
        },
        /*
         * Get ACL of a user key associated to this index
         *
         * @param callback the result callback with two arguments
         *  error: boolean set to true if the request had an error
         *  content: the server answer with user keys list or error description if error is true.
         */
        getUserKeyACL: function(key, callback) {
            var indexObj = this;
            this.as._jsonRequest({ method: 'GET',
                                   url: '/1/indexes/' + encodeURIComponent(indexObj.indexName) + '/keys/' + key,
                                   callback: function(error, res, body) {
                if (!_.isUndefined(callback)) {
                    callback(error, body);
                }
            }});
        },
        /*
         * Delete an existing user key associated to this index
         *
         * @param callback the result callback with two arguments
         *  error: boolean set to true if the request had an error
         *  content: the server answer with user keys list or error description if error is true.
         */
        deleteUserKey: function(key, callback) {
            var indexObj = this;
            this.as._jsonRequest({ method: 'DELETE',
                                   url: '/1/indexes/' + encodeURIComponent(indexObj.indexName) + '/keys/' + key,
                                   callback: function(error, res, body) {
                if (!_.isUndefined(callback)) {
                    callback(error, body);
                }
            }});
        },
        /*
         * Add an existing user key associated to this index
         *
         * @param acls the list of ACL for this key. Defined by an array of strings that
         * can contains the following values:
         *   - search: allow to search (https and http)
         *   - addObject: allows to add/update an object in the index (https only)
         *   - deleteObject : allows to delete an existing object (https only)
         *   - deleteIndex : allows to delete index content (https only)
         *   - settings : allows to get index settings (https only)
         *   - editSettings : allows to change index settings (https only)
         * @param callback the result callback with two arguments
         *  error: boolean set to true if the request had an error
         *  content: the server answer with user keys list or error description if error is true.
         */
        addUserKey: function(acls, callback) {
            var indexObj = this;
            var aclsObject = {};
            aclsObject.acl = acls;
            this.as._jsonRequest({ method: 'POST',
                                   url: '/1/indexes/' + encodeURIComponent(indexObj.indexName) + '/keys',
                                   body: aclsObject,
                                   callback: function(error, res, body) {
                if (!_.isUndefined(callback)) {
                    callback(error, body);
                }
            }});
        },
        /*
         * Add an existing user key associated to this index
         *
         * @param acls the list of ACL for this key. Defined by an array of strings that
         * can contains the following values:
         *   - search: allow to search (https and http)
         *   - addObject: allows to add/update an object in the index (https only)
         *   - deleteObject : allows to delete an existing object (https only)
         *   - deleteIndex : allows to delete index content (https only)
         *   - settings : allows to get index settings (https only)
         *   - editSettings : allows to change index settings (https only)
         * @param validity the number of seconds after which the key will be automatically removed (0 means no time limit for this key)
         * @param maxQueriesPerIPPerHour Specify the maximum number of API calls allowed from an IP address per hour.  Defaults to 0 (no rate limit).
         * @param maxHitsPerQuery Specify the maximum number of hits this API key can retrieve in one call. Defaults to 0 (unlimited)
         * @param callback the result callback with two arguments
         *  error: boolean set to true if the request had an error
         *  content: the server answer with user keys list or error description if error is true.
         */
        addUserKeyWithValidity: function(acls, validity, maxQueriesPerIPPerHour, maxHitsPerQuery, callback) {
            var indexObj = this;
            var aclsObject = {};
            aclsObject.acl = acls;
            aclsObject.validity = validity;
            aclsObject.maxQueriesPerIPPerHour = maxQueriesPerIPPerHour;
            aclsObject.maxHitsPerQuery = maxHitsPerQuery;

            this.as._jsonRequest({ method: 'POST',
                                   url: '/1/indexes/' + encodeURIComponent(indexObj.indexName) + '/keys',
                                   body: aclsObject,
                                   callback: function(error, res, body) {
                if (!_.isUndefined(callback)) {
                    callback(error, body);
                }
            }});
        },

        ///
        /// Internal methods only after this line
        ///
        /*
         * Transform search param object in query string
         */
        _getSearchParams: function(args, params) {
            if (_.isUndefined(args) || args == null) {
                return params;
            }
            for (var key in args) {
                if (key != null && args.hasOwnProperty(key)) {
                    params += (params.length === 0) ? '?' : '&';
                    params += key + '=' + encodeURIComponent(Object.prototype.toString.call(args[key]) === '[object Array]' ? JSON.stringify(args[key]) : args[key]);
                }
            }
            return params;
        },

        // internal attributes
        as: null,
        indexName: null,
        emptyConstructor: function() {}
};

module.exports = AlgoliaSearch;
