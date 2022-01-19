/* eslint camelcase: "off" */

import { _, console } from './utils'
import { cookieStore, localStore, localPlusCookieStore, memoryStore } from './storage'

/*
 * Constants
 */
/** @const */ var SET_QUEUE_KEY = '__mps'
/** @const */ var SET_ONCE_QUEUE_KEY = '__mpso'
/** @const */ var UNSET_QUEUE_KEY = '__mpus'
/** @const */ var ADD_QUEUE_KEY = '__mpa'
/** @const */ var APPEND_QUEUE_KEY = '__mpap'
/** @const */ var REMOVE_QUEUE_KEY = '__mpr'
/** @const */ var UNION_QUEUE_KEY = '__mpu'
/** @const */ var CAMPAIGN_IDS_KEY = '__cmpns'
/** @const */ var EVENT_TIMERS_KEY = '__timers'
/** @const */ var SESSION_RECORDING_ENABLED = '$session_recording_enabled'
/** @const */ var SESSION_ID = '$sesid'
/** @const */ var ENABLED_FEATURE_FLAGS = '$enabled_feature_flags'
/** @const */ var RESERVED_PROPERTIES = [
    SET_QUEUE_KEY,
    SET_ONCE_QUEUE_KEY,
    UNSET_QUEUE_KEY,
    ADD_QUEUE_KEY,
    APPEND_QUEUE_KEY,
    REMOVE_QUEUE_KEY,
    UNION_QUEUE_KEY,
    CAMPAIGN_IDS_KEY,
    EVENT_TIMERS_KEY,
    SESSION_RECORDING_ENABLED,
    SESSION_ID,
    ENABLED_FEATURE_FLAGS,
]

/**
 * UserMaven Persistence Object
 * @constructor
 */
var UserMavenPersistence = function (config) {
    // clean chars that aren't accepted by the http spec for cookie values
    // https://datatracker.ietf.org/doc/html/rfc2616#section-2.2
    let token = ''

    if (config['token']) {
        token = config['token'].replace(/\+/g, 'PL').replace(/\//g, 'SL').replace(/=/g, 'EQ')
    }

    this['props'] = {}
    this.campaign_params_saved = false

    if (config['persistence_name']) {
        this.name = 'um_' + config['persistence_name']
    } else {
        this.name = 'um_' + token + '_usermaven'
    }

    var storage_type = config['persistence']
    if (storage_type !== 'cookie' && storage_type.indexOf('localStorage') === -1 && storage_type !== 'memory') {
        console.critical('Unknown persistence type ' + storage_type + '; falling back to cookie')
        storage_type = config['persistence'] = 'cookie'
    }
    if (storage_type === 'localStorage' && localStore.is_supported()) {
        this.storage = localStore
    } else if (storage_type === 'localStorage+cookie' && localPlusCookieStore.is_supported()) {
        this.storage = localPlusCookieStore
    } else if (storage_type === 'memory') {
        this.storage = memoryStore
    } else {
        this.storage = cookieStore
    }

    this.load()
    this.update_config(config)
    this.save()
}

UserMavenPersistence.prototype.properties = function () {
    var p = {}
    // Filter out reserved properties
    _.each(this['props'], function (v, k) {
        if (k === ENABLED_FEATURE_FLAGS && typeof v === 'object') {
            var keys = Object.keys(v)
            for (var i = 0; i < keys.length; i++) {
                p[`$feature/${keys[i]}`] = v[keys[i]]
            }
        } else if (!_.include(RESERVED_PROPERTIES, k)) {
            p[k] = v
        }
    })
    return p
}

UserMavenPersistence.prototype.load = function () {
    if (this.disabled) {
        return
    }

    var entry = this.storage.parse(this.name)

    if (entry) {
        this['props'] = _.extend({}, entry)
    }
}

UserMavenPersistence.prototype.save = function () {
    if (this.disabled) {
        return
    }
    this.storage.set(this.name, this['props'], this.expire_days, this.cross_subdomain, this.secure)
}

UserMavenPersistence.prototype.remove = function () {
    // remove both domain and subdomain cookies
    this.storage.remove(this.name, false)
    this.storage.remove(this.name, true)
}

// removes the storage entry and deletes all loaded data
// forced name for tests
UserMavenPersistence.prototype.clear = function () {
    this.remove()
    this['props'] = {}
}

/**
 * @param {Object} props
 * @param {*=} default_value
 * @param {number=} days
 */
UserMavenPersistence.prototype.register_once = function (props, default_value, days) {
    if (_.isObject(props)) {
        if (typeof default_value === 'undefined') {
            default_value = 'None'
        }
        this.expire_days = typeof days === 'undefined' ? this.default_expiry : days

        _.each(
            props,
            function (val, prop) {
                if (!this['props'].hasOwnProperty(prop) || this['props'][prop] === default_value) {
                    this['props'][prop] = val
                }
            },
            this
        )

        this.save()

        return true
    }
    return false
}

/**
 * @param {Object} props
 * @param {number=} days
 */
UserMavenPersistence.prototype.register = function (props, days) {
    if (_.isObject(props)) {
        this.expire_days = typeof days === 'undefined' ? this.default_expiry : days

        _.extend(this['props'], props)

        this.save()

        return true
    }
    return false
}

UserMavenPersistence.prototype.unregister = function (prop) {
    if (prop in this['props']) {
        delete this['props'][prop]
        this.save()
    }
}

UserMavenPersistence.prototype.update_campaign_params = function () {
    if (!this.campaign_params_saved) {
        this.register(_.info.campaignParams())
        this.campaign_params_saved = true
    }
}

UserMavenPersistence.prototype.update_search_keyword = function (referrer) {
    this.register(_.info.searchInfo(referrer))
}

// EXPORTED METHOD, we test this directly.
UserMavenPersistence.prototype.update_referrer_info = function (referrer) {
    // If referrer doesn't exist, we want to note the fact that it was type-in traffic.
    // Register once, so first touch
    this.register_once(
        {
            $initial_referrer: referrer || '$direct',
            $initial_referring_domain: _.info.referringDomain(referrer) || '$direct',
        },
        ''
    )
    // Register the current referrer but override if it's different, hence register
    this.register({
        $referrer: referrer || this['props']['$referrer'] || '$direct',
        $referring_domain: _.info.referringDomain(referrer) || this['props']['$referring_domain'] || '$direct',
    })
}

UserMavenPersistence.prototype.get_referrer_info = function () {
    return _.strip_empty_properties({
        $initial_referrer: this['props']['$initial_referrer'],
        $initial_referring_domain: this['props']['$initial_referring_domain'],
    })
}

// safely fills the passed in object with stored properties,
// does not override any properties defined in both
// returns the passed in object
UserMavenPersistence.prototype.safe_merge = function (props) {
    _.each(this['props'], function (val, prop) {
        if (!(prop in props)) {
            props[prop] = val
        }
    })

    return props
}

UserMavenPersistence.prototype.update_config = function (config) {
    this.default_expiry = this.expire_days = config['cookie_expiration']
    this.set_disabled(config['disable_persistence'])
    this.set_cross_subdomain(config['cross_subdomain_cookie'])
    this.set_secure(config['secure_cookie'])
}

UserMavenPersistence.prototype.set_disabled = function (disabled) {
    this.disabled = disabled
    if (this.disabled) {
        this.remove()
    } else {
        this.save()
    }
}

UserMavenPersistence.prototype.set_cross_subdomain = function (cross_subdomain) {
    if (cross_subdomain !== this.cross_subdomain) {
        this.cross_subdomain = cross_subdomain
        this.remove()
        this.save()
    }
}

UserMavenPersistence.prototype.get_cross_subdomain = function () {
    return this.cross_subdomain
}

UserMavenPersistence.prototype.set_secure = function (secure) {
    if (secure !== this.secure) {
        this.secure = secure ? true : false
        this.remove()
        this.save()
    }
}

UserMavenPersistence.prototype.set_event_timer = function (event_name, timestamp) {
    var timers = this['props'][EVENT_TIMERS_KEY] || {}
    timers[event_name] = timestamp
    this['props'][EVENT_TIMERS_KEY] = timers
    this.save()
}

UserMavenPersistence.prototype.remove_event_timer = function (event_name) {
    var timers = this['props'][EVENT_TIMERS_KEY] || {}
    var timestamp = timers[event_name]
    if (!_.isUndefined(timestamp)) {
        delete this['props'][EVENT_TIMERS_KEY][event_name]
        this.save()
    }
    return timestamp
}

export {
    UserMavenPersistence,
    SET_QUEUE_KEY,
    SET_ONCE_QUEUE_KEY,
    CAMPAIGN_IDS_KEY,
    EVENT_TIMERS_KEY,
    SESSION_RECORDING_ENABLED,
    SESSION_ID,
}