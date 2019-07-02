"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
var aurelia_event_aggregator_1 = require("aurelia-event-aggregator");
var aurelia_dependency_injection_1 = require("aurelia-dependency-injection");
var oauth_token_service_1 = require("./oauth-token-service");
var url_hash_service_1 = require("./url-hash-service");
var local_storage_service_1 = require("./local-storage-service");
var oauth_polyfills_1 = require("./oauth-polyfills");
var OAUTH_STARTPAGE_STORAGE_KEY = 'oauth.startPage';
var OAuthService = (function () {
    function OAuthService(oAuthTokenService, urlHashService, localStorageService, eventAggregator) {
        var _this = this;
        this.oAuthTokenService = oAuthTokenService;
        this.urlHashService = urlHashService;
        this.localStorageService = localStorageService;
        this.eventAggregator = eventAggregator;
        this.configure = function (config) {
            if (_this.config) {
                throw new Error('OAuthProvider already configured.');
            }
            if (config.loginUrl.substr(-1) === '/') {
                config.loginUrl = config.loginUrl.slice(0, -1);
            }
            if (config.logoutUrl.substr(-1) === '/') {
                config.logoutUrl = config.logoutUrl.slice(0, -1);
            }
            _this.config = oauth_polyfills_1.objectAssign(_this.defaults, config);
            var existingHash = window.location.hash;
            var pathDefault = window.location.href;
            if (existingHash) {
                pathDefault = pathDefault.replace(existingHash, '');
            }
            if (pathDefault.substr(-1) === '#') {
                pathDefault = pathDefault.slice(0, -1);
            }
            _this.config.redirectUri = config.redirectUri || pathDefault;
            return config;
        };
        this.isAuthenticated = function () {
            return _this.oAuthTokenService.getToken();
        };
        this.login = function () {
            window.location.href = _this.getRedirectUrl();
        };
        this.logout = function () {
            var redirectUrl = _this.config.logoutUrl + "?" +
                (_this.config.logoutRedirectParameterName + "=" + encodeURIComponent(_this.config.redirectUri));
            window.location.href = redirectUrl;
            _this.oAuthTokenService.removeToken();
        };
        this.loginOnStateChange = function (toState) {
            if (toState && _this.isLoginRequired(toState) && !_this.isAuthenticated() && !_this.getTokenDataFromUrl()) {
                if (_this.localStorageService.isStorageSupported()) {
                    var url = window.location.href;
                    if (!window.location.hash) {
                        url = _this.getBaseRouteUrl();
                    }
                    _this.localStorageService.set(OAUTH_STARTPAGE_STORAGE_KEY, url);
                }
                _this.login();
                return true;
            }
            return false;
        };
        this.setTokenOnRedirect = function () {
            var tokenData = _this.getTokenDataFromUrl();
            if (!_this.isAuthenticated() && tokenData) {
                _this.oAuthTokenService.setToken(tokenData);
                if (_this.localStorageService.isStorageSupported() && _this.localStorageService.get(OAUTH_STARTPAGE_STORAGE_KEY)) {
                    var startPage = _this.localStorageService.get(OAUTH_STARTPAGE_STORAGE_KEY);
                    _this.localStorageService.remove(OAUTH_STARTPAGE_STORAGE_KEY);
                    window.location.href = startPage;
                }
                else {
                    window.location.href = _this.getBaseRouteUrl();
                }
                _this.eventAggregator.publish(OAuthService_1.LOGIN_SUCCESS_EVENT, tokenData);
                if (_this.config.autoTokenRenewal) {
                    _this.setAutomaticTokenRenewal();
                }
            }
        };
        this.isLoginRequired = function (state) {
            var routeHasConfig = state.settings && state.settings.requireLogin !== undefined;
            var routeRequiresLogin = routeHasConfig && state.settings.requireLogin ? true : false;
            return routeHasConfig ? routeRequiresLogin : _this.config.alwaysRequireLogin;
        };
        this.getTokenDataFromUrl = function (hash) {
            var hashData = _this.urlHashService.getHashData(hash);
            var tokenData = _this.oAuthTokenService.createToken(hashData);
            return tokenData;
        };
        this.getBaseRouteUrl = function () {
            return window.location.origin + '/#/';
        };
        this.getSimpleNonceValue = function () {
            return ((Date.now() + Math.random()) * Math.random()).toString().replace('.', '');
        };
        this.defaults = {
            loginUrl: null,
            logoutUrl: null,
            clientId: null,
            logoutRedirectParameterName: 'post_logout_redirect_uri',
            scope: null,
            resource: null,
            state: null,
            alwaysRequireLogin: false,
            autoTokenRenewal: true
        };
    }
    OAuthService_1 = OAuthService;
    Object.defineProperty(OAuthService, "LOGIN_SUCCESS_EVENT", {
        get: function () { return 'oauth:loginSuccess'; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(OAuthService, "INVALID_TOKEN_EVENT", {
        get: function () { return 'oauth:invalidToken'; },
        enumerable: true,
        configurable: true
    });
    OAuthService.prototype.getRedirectUrl = function () {
        var redirectUrl = this.config.loginUrl + "?" +
            ("response_type=" + this.oAuthTokenService.config.name + "&") +
            ("client_id=" + encodeURIComponent(this.config.clientId) + "&") +
            ("redirect_uri=" + encodeURIComponent(this.config.redirectUri) + "&") +
            ("nonce=" + encodeURIComponent(this.getSimpleNonceValue()));
        if (this.config.scope) {
            redirectUrl += "&scope=" + encodeURIComponent(this.config.scope);
        }
        if (this.config.resource) {
            redirectUrl += "&resource=" + encodeURIComponent(this.config.resource);
        }
        if (this.config.state) {
            redirectUrl += "&state=" + encodeURIComponent(this.config.state);
        }
        return redirectUrl;
    };
    OAuthService.prototype.setAutomaticTokenRenewal = function () {
        var _this = this;
        var tokenExpirationTime = this.oAuthTokenService.getTokenExpirationTime() * 1000;
        setTimeout(function () {
            var iFrame = document.createElement('iframe');
            iFrame.src = _this.getRedirectUrl();
            iFrame.style.display = 'none';
            iFrame.onload = function (event) {
                try {
                    var hashWithNewToken = iFrame.contentWindow.location.hash;
                    document.body.removeChild(iFrame);
                    var tokenData = _this.getTokenDataFromUrl(hashWithNewToken);
                    if (tokenData) {
                        _this.oAuthTokenService.setToken(tokenData);
                        _this.setAutomaticTokenRenewal();
                    }
                }
                catch (ex) {
                    document.body.removeChild(iFrame);
                }
            };
            document.body.appendChild(iFrame);
        }, tokenExpirationTime);
    };
    var OAuthService_1, _a;
    OAuthService = OAuthService_1 = __decorate([
        aurelia_dependency_injection_1.autoinject(),
        __metadata("design:paramtypes", [oauth_token_service_1.OAuthTokenService,
            url_hash_service_1.default,
            local_storage_service_1.default, typeof (_a = typeof aurelia_event_aggregator_1.EventAggregator !== "undefined" && aurelia_event_aggregator_1.EventAggregator) === "function" && _a || Object])
    ], OAuthService);
    return OAuthService;
}());
exports.OAuthService = OAuthService;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9vYXV0aC1zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0FBQUEscUVBQTJEO0FBQzNELDZFQUEwRDtBQUUxRCw2REFBMEU7QUFDMUUsdURBQWdEO0FBQ2hELGlFQUEwRDtBQUMxRCxxREFBaUQ7QUFFakQsSUFBTSwyQkFBMkIsR0FBVyxpQkFBaUIsQ0FBQztBQWdCOUQ7SUFTSSxzQkFDWSxpQkFBb0MsRUFDcEMsY0FBOEIsRUFDOUIsbUJBQXdDLEVBQ3hDLGVBQWdDO1FBSjVDLGlCQWlCQztRQWhCVyxzQkFBaUIsR0FBakIsaUJBQWlCLENBQW1CO1FBQ3BDLG1CQUFjLEdBQWQsY0FBYyxDQUFnQjtRQUM5Qix3QkFBbUIsR0FBbkIsbUJBQW1CLENBQXFCO1FBQ3hDLG9CQUFlLEdBQWYsZUFBZSxDQUFpQjtRQWVyQyxjQUFTLEdBQUcsVUFBQyxNQUFtQjtZQUNuQyxJQUFJLEtBQUksQ0FBQyxNQUFNLEVBQUU7Z0JBQ2IsTUFBTSxJQUFJLEtBQUssQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDO2FBQ3hEO1lBR0QsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRTtnQkFDcEMsTUFBTSxDQUFDLFFBQVEsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUNsRDtZQUVELElBQUksTUFBTSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUU7Z0JBQ3JDLE1BQU0sQ0FBQyxTQUFTLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDcEQ7WUFHRCxLQUFJLENBQUMsTUFBTSxHQUFHLDhCQUFZLENBQUMsS0FBSSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUds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QUFDLHdCQUF3QixFQUFFLENBQUM7cUJBQ25DO2lCQUNKO2dCQUFDLE9BQU8sRUFBRSxFQUFFO29CQUlULFFBQVEsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2lCQUNyQztZQUNMLENBQUMsQ0FBQztZQUVGLFFBQVEsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3RDLENBQUMsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO0lBQzVCLENBQUM7O0lBcE1RLFlBQVk7UUFEeEIseUNBQVUsRUFBRTt5Q0FXc0IsdUNBQWlCO1lBQ3BCLDBCQUFjO1lBQ1QsK0JBQW1CLHNCQUN2QiwwQ0FBZSxvQkFBZiwwQ0FBZTtPQWJuQyxZQUFZLENBcU14QjtJQUFELG1CQUFDO0NBck1ELEFBcU1DLElBQUE7QUFyTVksb0NBQVkiLCJmaWxlIjoib2F1dGgtc2VydmljZS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEV2ZW50QWdncmVnYXRvciB9IGZyb20gJ2F1cmVsaWEtZXZlbnQtYWdncmVnYXRvcic7XHJcbmltcG9ydCB7IGF1dG9pbmplY3QgfSBmcm9tICdhdXJlbGlhLWRlcGVuZGVuY3ktaW5qZWN0aW9uJztcclxuXHJcbmltcG9ydCB7IE9BdXRoVG9rZW5TZXJ2aWNlLCBPQXV0aFRva2VuRGF0YSB9IGZyb20gJy4vb2F1dGgtdG9rZW4tc2VydmljZSc7XHJcbmltcG9ydCBVcmxIYXNoU2VydmljZSBmcm9tICcuL3VybC1oYXNoLXNlcnZpY2UnO1xyXG5pbXBvcnQgTG9jYWxTdG9yYWdlU2VydmljZSBmcm9tICcuL2xvY2FsLXN0b3JhZ2Utc2VydmljZSc7XHJcbmltcG9ydCB7IG9iamVjdEFzc2lnbiB9IGZyb20gJy4vb2F1dGgtcG9seWZpbGxzJztcclxuXHJcbmNvbnN0IE9BVVRIX1NUQVJUUEFHRV9TVE9SQUdFX0tFWTogc3RyaW5nID0gJ29hdXRoLnN0YXJ0UGFnZSc7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIE9BdXRoQ29uZmlnIHtcclxuICAgIGxvZ2luVXJsOiBzdHJpbmc7XHJcbiAgICBsb2dvdXRVcmw6IHN0cmluZztcclxuICAgIGNsaWVudElkOiBzdHJpbmc7XHJcbiAgICBsb2dvdXRSZWRpcmVjdFBhcmFtZXRlck5hbWU/OiBzdHJpbmc7XHJcbiAgICBzY29wZT86IHN0cmluZztcclxuICAgIHJlc291cmNlPzogc3RyaW5nO1xyXG4gICAgc3RhdGU/OiBzdHJpbmc7XHJcbiAgICByZWRpcmVjdFVyaT86IHN0cmluZztcclxuICAgIGFsd2F5c1JlcXVpcmVMb2dpbj86IGJvb2xlYW47XHJcbiAgICBhdXRvVG9rZW5SZW5ld2FsPzogYm9vbGVhbjtcclxufVxyXG5cclxuQGF1dG9pbmplY3QoKVxyXG5leHBvcnQgY2xhc3MgT0F1dGhTZXJ2aWNlIHtcclxuXHJcbiAgICBwdWJsaWMgY29uZmlnOiBPQXV0aENvbmZpZztcclxuXHJcbiAgICBwcml2YXRlIGRlZmF1bHRzOiBPQXV0aENvbmZpZztcclxuXHJcbiAgICBwdWJsaWMgc3RhdGljIGdldCBMT0dJTl9TVUNDRVNTX0VWRU5UKCk6IHN0cmluZyB7IHJldHVybiAnb2F1dGg6bG9naW5TdWNjZXNzJzsgfVxyXG4gICAgcHVibGljIHN0YXRpYyBnZXQgSU5WQUxJRF9UT0tFTl9FVkVOVCgpOiBzdHJpbmcgeyByZXR1cm4gJ29hdXRoOmludmFsaWRUb2tlbic7IH1cclxuXHJcbiAgICBjb25zdHJ1Y3RvcihcclxuICAgICAgICBwcml2YXRlIG9BdXRoVG9rZW5TZXJ2aWNlOiBPQXV0aFRva2VuU2VydmljZSxcclxuICAgICAgICBwcml2YXRlIHVybEhhc2hTZXJ2aWNlOiBVcmxIYXNoU2VydmljZSxcclxuICAgICAgICBwcml2YXRlIGxvY2FsU3RvcmFnZVNlcnZpY2U6IExvY2FsU3RvcmFnZVNlcnZpY2UsXHJcbiAgICAgICAgcHJpdmF0ZSBldmVudEFnZ3JlZ2F0b3I6IEV2ZW50QWdncmVnYXRvcikge1xyXG5cclxuICAgICAgICB0aGlzLmRlZmF1bHRzID0ge1xyXG4gICAgICAgICAgICBsb2dpblVybDogbnVsbCxcclxuICAgICAgICAgICAgbG9nb3V0VXJsOiBudWxsLFxyXG4gICAgICAgICAgICBjbGllbnRJZDogbnVsbCxcclxuICAgICAgICAgICAgbG9nb3V0UmVkaXJlY3RQYXJhbWV0ZXJOYW1lOiAncG9zdF9sb2dvdXRfcmVkaXJlY3RfdXJpJyxcclxuICAgICAgICAgICAgc2NvcGU6IG51bGwsXHJcbiAgICAgICAgICAgIHJlc291cmNlOiBudWxsLFxyXG4gICAgICAgICAgICBzdGF0ZTogbnVsbCxcclxuICAgICAgICAgICAgYWx3YXlzUmVxdWlyZUxvZ2luOiBmYWxzZSxcclxuICAgICAgICAgICAgYXV0b1Rva2VuUmVuZXdhbDogdHJ1ZVxyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGNvbmZpZ3VyZSA9IChjb25maWc6IE9BdXRoQ29uZmlnKTogT0F1dGhDb25maWcgPT4ge1xyXG4gICAgICAgIGlmICh0aGlzLmNvbmZpZykge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ09BdXRoUHJvdmlkZXIgYWxyZWFkeSBjb25maWd1cmVkLicpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gUmVtb3ZlIHRyYWlsaW5nIHNsYXNoIGZyb20gdXJscy5cclxuICAgICAgICBpZiAoY29uZmlnLmxvZ2luVXJsLnN1YnN0cigtMSkgPT09ICcvJykge1xyXG4gICAgICAgICAgICBjb25maWcubG9naW5VcmwgPSBjb25maWcubG9naW5Vcmwuc2xpY2UoMCwgLTEpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGNvbmZpZy5sb2dvdXRVcmwuc3Vic3RyKC0xKSA9PT0gJy8nKSB7XHJcbiAgICAgICAgICAgIGNvbmZpZy5sb2dvdXRVcmwgPSBjb25maWcubG9nb3V0VXJsLnNsaWNlKDAsIC0xKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIEV4dGVuZCBkZWZhdWx0IGNvbmZpZ3VyYXRpb24uXHJcbiAgICAgICAgdGhpcy5jb25maWcgPSBvYmplY3RBc3NpZ24odGhpcy5kZWZhdWx0cywgY29uZmlnKTtcclxuXHJcbiAgICAgICAgLy8gUmVkaXJlY3QgaXMgc2V0IHRvIGN1cnJlbnQgbG9jYXRpb24gYnkgZGVmYXVsdFxyXG4gICAgICAgIGNvbnN0IGV4aXN0aW5nSGFzaCA9IHdpbmRvdy5sb2NhdGlvbi5oYXNoO1xyXG4gICAgICAgIGxldCBwYXRoRGVmYXVsdCA9IHdpbmRvdy5sb2NhdGlvbi5ocmVmO1xyXG5cclxuICAgICAgICAvLyBSZW1vdmUgbm90IG5lZWRlZCBwYXJ0cyBmcm9tIHVybHMuXHJcbiAgICAgICAgaWYgKGV4aXN0aW5nSGFzaCkge1xyXG4gICAgICAgICAgICBwYXRoRGVmYXVsdCA9IHBhdGhEZWZhdWx0LnJlcGxhY2UoZXhpc3RpbmdIYXNoLCAnJyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAocGF0aERlZmF1bHQuc3Vic3RyKC0xKSA9PT0gJyMnKSB7XHJcbiAgICAgICAgICAgIHBhdGhEZWZhdWx0ID0gcGF0aERlZmF1bHQuc2xpY2UoMCwgLTEpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5jb25maWcucmVkaXJlY3RVcmkgPSBjb25maWcucmVkaXJlY3RVcmkgfHwgcGF0aERlZmF1bHQ7XHJcblxyXG4gICAgICAgIHJldHVybiBjb25maWc7XHJcbiAgICB9O1xyXG5cclxuICAgIHB1YmxpYyBpc0F1dGhlbnRpY2F0ZWQgPSAoKTogYm9vbGVhbiA9PiB7XHJcbiAgICAgICAgcmV0dXJuIDxhbnk+dGhpcy5vQXV0aFRva2VuU2VydmljZS5nZXRUb2tlbigpO1xyXG4gICAgfTtcclxuXHJcbiAgICBwdWJsaWMgbG9naW4gPSAoKTogdm9pZCA9PiB7XHJcbiAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSB0aGlzLmdldFJlZGlyZWN0VXJsKCk7XHJcbiAgICB9O1xyXG5cclxuICAgIHB1YmxpYyBsb2dvdXQgPSAoKTogdm9pZCA9PiB7XHJcbiAgICAgICAgY29uc3QgcmVkaXJlY3RVcmwgPSBgJHt0aGlzLmNvbmZpZy5sb2dvdXRVcmx9P2AgK1xyXG4gICAgICAgICAgICBgJHt0aGlzLmNvbmZpZy5sb2dvdXRSZWRpcmVjdFBhcmFtZXRlck5hbWV9PSR7ZW5jb2RlVVJJQ29tcG9uZW50KHRoaXMuY29uZmlnLnJlZGlyZWN0VXJpKX1gO1xyXG5cclxuICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IHJlZGlyZWN0VXJsO1xyXG4gICAgICAgIHRoaXMub0F1dGhUb2tlblNlcnZpY2UucmVtb3ZlVG9rZW4oKTtcclxuICAgIH07XHJcblxyXG4gICAgcHVibGljIGxvZ2luT25TdGF0ZUNoYW5nZSA9ICh0b1N0YXRlKTogYm9vbGVhbiA9PiB7XHJcbiAgICAgICAgaWYgKHRvU3RhdGUgJiYgdGhpcy5pc0xvZ2luUmVxdWlyZWQodG9TdGF0ZSkgJiYgIXRoaXMuaXNBdXRoZW50aWNhdGVkKCkgJiYgIXRoaXMuZ2V0VG9rZW5EYXRhRnJvbVVybCgpKSB7XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5sb2NhbFN0b3JhZ2VTZXJ2aWNlLmlzU3RvcmFnZVN1cHBvcnRlZCgpKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgdXJsID0gd2luZG93LmxvY2F0aW9uLmhyZWY7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKCF3aW5kb3cubG9jYXRpb24uaGFzaCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHVybCA9IHRoaXMuZ2V0QmFzZVJvdXRlVXJsKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5sb2NhbFN0b3JhZ2VTZXJ2aWNlLnNldDxzdHJpbmc+KE9BVVRIX1NUQVJUUEFHRV9TVE9SQUdFX0tFWSwgdXJsKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5sb2dpbigpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9O1xyXG5cclxuICAgIHB1YmxpYyBzZXRUb2tlbk9uUmVkaXJlY3QgPSAoKTogdm9pZCA9PiB7XHJcbiAgICAgICAgY29uc3QgdG9rZW5EYXRhID0gdGhpcy5nZXRUb2tlbkRhdGFGcm9tVXJsKCk7XHJcblxyXG4gICAgICAgIGlmICghdGhpcy5pc0F1dGhlbnRpY2F0ZWQoKSAmJiB0b2tlbkRhdGEpIHtcclxuICAgICAgICAgICAgdGhpcy5vQXV0aFRva2VuU2VydmljZS5zZXRUb2tlbih0b2tlbkRhdGEpO1xyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMubG9jYWxTdG9yYWdlU2VydmljZS5pc1N0b3JhZ2VTdXBwb3J0ZWQoKSAmJiB0aGlzLmxvY2FsU3RvcmFnZVNlcnZpY2UuZ2V0KE9BVVRIX1NUQVJUUEFHRV9TVE9SQUdFX0tFWSkpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHN0YXJ0UGFnZSA9IHRoaXMubG9jYWxTdG9yYWdlU2VydmljZS5nZXQ8c3RyaW5nPihPQVVUSF9TVEFSVFBBR0VfU1RPUkFHRV9LRVkpO1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMubG9jYWxTdG9yYWdlU2VydmljZS5yZW1vdmUoT0FVVEhfU1RBUlRQQUdFX1NUT1JBR0VfS0VZKTtcclxuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gc3RhcnRQYWdlO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgLy8gUmVkaXJlY3QgdG8gdGhlIGJhc2UgYXBwbGljYXRpb24gcm91dGVcclxuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gdGhpcy5nZXRCYXNlUm91dGVVcmwoKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5ldmVudEFnZ3JlZ2F0b3IucHVibGlzaChPQXV0aFNlcnZpY2UuTE9HSU5fU1VDQ0VTU19FVkVOVCwgdG9rZW5EYXRhKTtcclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLmNvbmZpZy5hdXRvVG9rZW5SZW5ld2FsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNldEF1dG9tYXRpY1Rva2VuUmVuZXdhbCgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBwcml2YXRlIGlzTG9naW5SZXF1aXJlZCA9IChzdGF0ZSk6IGJvb2xlYW4gPT4ge1xyXG4gICAgICAgIGNvbnN0IHJvdXRlSGFzQ29uZmlnID0gc3RhdGUuc2V0dGluZ3MgJiYgc3RhdGUuc2V0dGluZ3MucmVxdWlyZUxvZ2luICE9PSB1bmRlZmluZWQ7XHJcbiAgICAgICAgY29uc3Qgcm91dGVSZXF1aXJlc0xvZ2luID0gcm91dGVIYXNDb25maWcgJiYgc3RhdGUuc2V0dGluZ3MucmVxdWlyZUxvZ2luID8gdHJ1ZSA6IGZhbHNlO1xyXG5cclxuICAgICAgICByZXR1cm4gcm91dGVIYXNDb25maWcgPyByb3V0ZVJlcXVpcmVzTG9naW4gOiB0aGlzLmNvbmZpZy5hbHdheXNSZXF1aXJlTG9naW47XHJcbiAgICB9O1xyXG5cclxuICAgIHByaXZhdGUgZ2V0VG9rZW5EYXRhRnJvbVVybCA9IChoYXNoPzogc3RyaW5nKTogT0F1dGhUb2tlbkRhdGEgPT4ge1xyXG4gICAgICAgIGNvbnN0IGhhc2hEYXRhID0gdGhpcy51cmxIYXNoU2VydmljZS5nZXRIYXNoRGF0YShoYXNoKTtcclxuICAgICAgICBjb25zdCB0b2tlbkRhdGEgPSB0aGlzLm9BdXRoVG9rZW5TZXJ2aWNlLmNyZWF0ZVRva2VuKGhhc2hEYXRhKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHRva2VuRGF0YTtcclxuICAgIH07XHJcblxyXG4gICAgcHJpdmF0ZSBnZXRCYXNlUm91dGVVcmwgPSAoKTogc3RyaW5nID0+IHtcclxuICAgICAgICByZXR1cm4gd2luZG93LmxvY2F0aW9uLm9yaWdpbiArICcvIy8nO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZ2V0U2ltcGxlTm9uY2VWYWx1ZSA9ICgpOiBzdHJpbmcgPT4ge1xyXG4gICAgICAgIHJldHVybiAoKERhdGUubm93KCkgKyBNYXRoLnJhbmRvbSgpKSAqIE1hdGgucmFuZG9tKCkpLnRvU3RyaW5nKCkucmVwbGFjZSgnLicsICcnKTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGdldFJlZGlyZWN0VXJsKCkge1xyXG4gICAgICAgIGxldCByZWRpcmVjdFVybCA9IGAke3RoaXMuY29uZmlnLmxvZ2luVXJsfT9gICtcclxuICAgICAgICAgICAgYHJlc3BvbnNlX3R5cGU9JHt0aGlzLm9BdXRoVG9rZW5TZXJ2aWNlLmNvbmZpZy5uYW1lfSZgICtcclxuICAgICAgICAgICAgYGNsaWVudF9pZD0ke2VuY29kZVVSSUNvbXBvbmVudCh0aGlzLmNvbmZpZy5jbGllbnRJZCl9JmAgK1xyXG4gICAgICAgICAgICBgcmVkaXJlY3RfdXJpPSR7ZW5jb2RlVVJJQ29tcG9uZW50KHRoaXMuY29uZmlnLnJlZGlyZWN0VXJpKX0mYCArXHJcbiAgICAgICAgICAgIGBub25jZT0ke2VuY29kZVVSSUNvbXBvbmVudCh0aGlzLmdldFNpbXBsZU5vbmNlVmFsdWUoKSl9YDtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuY29uZmlnLnNjb3BlKSB7XHJcbiAgICAgICAgICAgIHJlZGlyZWN0VXJsICs9IGAmc2NvcGU9JHtlbmNvZGVVUklDb21wb25lbnQodGhpcy5jb25maWcuc2NvcGUpfWA7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5jb25maWcucmVzb3VyY2UpIHtcclxuICAgICAgICAgICAgcmVkaXJlY3RVcmwgKz0gYCZyZXNvdXJjZT0ke2VuY29kZVVSSUNvbXBvbmVudCh0aGlzLmNvbmZpZy5yZXNvdXJjZSl9YDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmNvbmZpZy5zdGF0ZSkge1xyXG4gICAgICAgICAgICByZWRpcmVjdFVybCArPSBgJnN0YXRlPSR7ZW5jb2RlVVJJQ29tcG9uZW50KHRoaXMuY29uZmlnLnN0YXRlKX1gO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHJlZGlyZWN0VXJsO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgc2V0QXV0b21hdGljVG9rZW5SZW5ld2FsKCkge1xyXG4gICAgICAgIGNvbnN0IHRva2VuRXhwaXJhdGlvblRpbWUgPSB0aGlzLm9BdXRoVG9rZW5TZXJ2aWNlLmdldFRva2VuRXhwaXJhdGlvblRpbWUoKSAqIDEwMDA7XHJcblxyXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBpRnJhbWUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpZnJhbWUnKTtcclxuICAgICAgICAgICAgaUZyYW1lLnNyYyA9IHRoaXMuZ2V0UmVkaXJlY3RVcmwoKTtcclxuICAgICAgICAgICAgaUZyYW1lLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XHJcbiAgICAgICAgICAgIGlGcmFtZS5vbmxvYWQgPSAoZXZlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaGFzaFdpdGhOZXdUb2tlbiA9IGlGcmFtZS5jb250ZW50V2luZG93LmxvY2F0aW9uLmhhc2g7XHJcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZChpRnJhbWUpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0b2tlbkRhdGEgPSB0aGlzLmdldFRva2VuRGF0YUZyb21VcmwoaGFzaFdpdGhOZXdUb2tlbik7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0b2tlbkRhdGEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5vQXV0aFRva2VuU2VydmljZS5zZXRUb2tlbih0b2tlbkRhdGEpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNldEF1dG9tYXRpY1Rva2VuUmVuZXdhbCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGV4KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gaUZyYW1lLmNvbnRlbnRXaW5kb3cgY2FuIGZhaWwgd2hlbiBhbiBpZnJhbWUgbG9hZHMgaWRlbnRpdHkgc2VydmVyIGxvZ2luIHBhZ2VcclxuICAgICAgICAgICAgICAgICAgICAvLyBidXQgdGhpcyBwYWdlIHdpbGwgbm90IHJlZGlyZWN0IGJhY2sgdG8gdGhlIGFwcCB1cmwgd2FpdGluZyBmb3IgdGhlIHVzZXIgdG8gbG9naW4gaW5cclxuICAgICAgICAgICAgICAgICAgICAvLyB0aGlzIGJlaGF2aW91ciBteSBvY2N1ciBpLmUuIHdoZW4gbG9naW4gcGFnZSBhdXRoZW50aWNhdGlvbiBjb29raWVzIGV4cGlyZVxyXG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQoaUZyYW1lKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoaUZyYW1lKTtcclxuICAgICAgICB9LCB0b2tlbkV4cGlyYXRpb25UaW1lKTtcclxuICAgIH1cclxufVxyXG4iXX0=
