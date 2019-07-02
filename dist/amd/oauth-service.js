var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
define(["require", "exports", "aurelia-event-aggregator", "aurelia-dependency-injection", "./oauth-token-service", "./url-hash-service", "./local-storage-service", "./oauth-polyfills"], function (require, exports, aurelia_event_aggregator_1, aurelia_dependency_injection_1, oauth_token_service_1, url_hash_service_1, local_storage_service_1, oauth_polyfills_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
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
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,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eUJBQ25DO3FCQUNKO29CQUFDLE9BQU8sRUFBRSxFQUFFO3dCQUlULFFBQVEsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDO3FCQUNyQztnQkFDTCxDQUFDLENBQUM7Z0JBRUYsUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDdEMsQ0FBQyxFQUFFLG1CQUFtQixDQUFDLENBQUM7UUFDNUIsQ0FBQzs7UUFwTVEsWUFBWTtZQUR4Qix5Q0FBVSxFQUFFOzZDQVdzQix1Q0FBaUI7Z0JBQ3BCLDBCQUFjO2dCQUNULCtCQUFtQixzQkFDdkIsMENBQWUsb0JBQWYsMENBQWU7V0FibkMsWUFBWSxDQXFNeEI7UUFBRCxtQkFBQztLQXJNRCxBQXFNQyxJQUFBO0lBck1ZLG9DQUFZIiwiZmlsZSI6Im9hdXRoLXNlcnZpY2UuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBFdmVudEFnZ3JlZ2F0b3IgfSBmcm9tICdhdXJlbGlhLWV2ZW50LWFnZ3JlZ2F0b3InO1xyXG5pbXBvcnQgeyBhdXRvaW5qZWN0IH0gZnJvbSAnYXVyZWxpYS1kZXBlbmRlbmN5LWluamVjdGlvbic7XHJcblxyXG5pbXBvcnQgeyBPQXV0aFRva2VuU2VydmljZSwgT0F1dGhUb2tlbkRhdGEgfSBmcm9tICcuL29hdXRoLXRva2VuLXNlcnZpY2UnO1xyXG5pbXBvcnQgVXJsSGFzaFNlcnZpY2UgZnJvbSAnLi91cmwtaGFzaC1zZXJ2aWNlJztcclxuaW1wb3J0IExvY2FsU3RvcmFnZVNlcnZpY2UgZnJvbSAnLi9sb2NhbC1zdG9yYWdlLXNlcnZpY2UnO1xyXG5pbXBvcnQgeyBvYmplY3RBc3NpZ24gfSBmcm9tICcuL29hdXRoLXBvbHlmaWxscyc7XHJcblxyXG5jb25zdCBPQVVUSF9TVEFSVFBBR0VfU1RPUkFHRV9LRVk6IHN0cmluZyA9ICdvYXV0aC5zdGFydFBhZ2UnO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBPQXV0aENvbmZpZyB7XHJcbiAgICBsb2dpblVybDogc3RyaW5nO1xyXG4gICAgbG9nb3V0VXJsOiBzdHJpbmc7XHJcbiAgICBjbGllbnRJZDogc3RyaW5nO1xyXG4gICAgbG9nb3V0UmVkaXJlY3RQYXJhbWV0ZXJOYW1lPzogc3RyaW5nO1xyXG4gICAgc2NvcGU/OiBzdHJpbmc7XHJcbiAgICByZXNvdXJjZT86IHN0cmluZztcclxuICAgIHN0YXRlPzogc3RyaW5nO1xyXG4gICAgcmVkaXJlY3RVcmk/OiBzdHJpbmc7XHJcbiAgICBhbHdheXNSZXF1aXJlTG9naW4/OiBib29sZWFuO1xyXG4gICAgYXV0b1Rva2VuUmVuZXdhbD86IGJvb2xlYW47XHJcbn1cclxuXHJcbkBhdXRvaW5qZWN0KClcclxuZXhwb3J0IGNsYXNzIE9BdXRoU2VydmljZSB7XHJcblxyXG4gICAgcHVibGljIGNvbmZpZzogT0F1dGhDb25maWc7XHJcblxyXG4gICAgcHJpdmF0ZSBkZWZhdWx0czogT0F1dGhDb25maWc7XHJcblxyXG4gICAgcHVibGljIHN0YXRpYyBnZXQgTE9HSU5fU1VDQ0VTU19FVkVOVCgpOiBzdHJpbmcgeyByZXR1cm4gJ29hdXRoOmxvZ2luU3VjY2Vzcyc7IH1cclxuICAgIHB1YmxpYyBzdGF0aWMgZ2V0IElOVkFMSURfVE9LRU5fRVZFTlQoKTogc3RyaW5nIHsgcmV0dXJuICdvYXV0aDppbnZhbGlkVG9rZW4nOyB9XHJcblxyXG4gICAgY29uc3RydWN0b3IoXHJcbiAgICAgICAgcHJpdmF0ZSBvQXV0aFRva2VuU2VydmljZTogT0F1dGhUb2tlblNlcnZpY2UsXHJcbiAgICAgICAgcHJpdmF0ZSB1cmxIYXNoU2VydmljZTogVXJsSGFzaFNlcnZpY2UsXHJcbiAgICAgICAgcHJpdmF0ZSBsb2NhbFN0b3JhZ2VTZXJ2aWNlOiBMb2NhbFN0b3JhZ2VTZXJ2aWNlLFxyXG4gICAgICAgIHByaXZhdGUgZXZlbnRBZ2dyZWdhdG9yOiBFdmVudEFnZ3JlZ2F0b3IpIHtcclxuXHJcbiAgICAgICAgdGhpcy5kZWZhdWx0cyA9IHtcclxuICAgICAgICAgICAgbG9naW5Vcmw6IG51bGwsXHJcbiAgICAgICAgICAgIGxvZ291dFVybDogbnVsbCxcclxuICAgICAgICAgICAgY2xpZW50SWQ6IG51bGwsXHJcbiAgICAgICAgICAgIGxvZ291dFJlZGlyZWN0UGFyYW1ldGVyTmFtZTogJ3Bvc3RfbG9nb3V0X3JlZGlyZWN0X3VyaScsXHJcbiAgICAgICAgICAgIHNjb3BlOiBudWxsLFxyXG4gICAgICAgICAgICByZXNvdXJjZTogbnVsbCxcclxuICAgICAgICAgICAgc3RhdGU6IG51bGwsXHJcbiAgICAgICAgICAgIGFsd2F5c1JlcXVpcmVMb2dpbjogZmFsc2UsXHJcbiAgICAgICAgICAgIGF1dG9Ub2tlblJlbmV3YWw6IHRydWVcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBjb25maWd1cmUgPSAoY29uZmlnOiBPQXV0aENvbmZpZyk6IE9BdXRoQ29uZmlnID0+IHtcclxuICAgICAgICBpZiAodGhpcy5jb25maWcpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdPQXV0aFByb3ZpZGVyIGFscmVhZHkgY29uZmlndXJlZC4nKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFJlbW92ZSB0cmFpbGluZyBzbGFzaCBmcm9tIHVybHMuXHJcbiAgICAgICAgaWYgKGNvbmZpZy5sb2dpblVybC5zdWJzdHIoLTEpID09PSAnLycpIHtcclxuICAgICAgICAgICAgY29uZmlnLmxvZ2luVXJsID0gY29uZmlnLmxvZ2luVXJsLnNsaWNlKDAsIC0xKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChjb25maWcubG9nb3V0VXJsLnN1YnN0cigtMSkgPT09ICcvJykge1xyXG4gICAgICAgICAgICBjb25maWcubG9nb3V0VXJsID0gY29uZmlnLmxvZ291dFVybC5zbGljZSgwLCAtMSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBFeHRlbmQgZGVmYXVsdCBjb25maWd1cmF0aW9uLlxyXG4gICAgICAgIHRoaXMuY29uZmlnID0gb2JqZWN0QXNzaWduKHRoaXMuZGVmYXVsdHMsIGNvbmZpZyk7XHJcblxyXG4gICAgICAgIC8vIFJlZGlyZWN0IGlzIHNldCB0byBjdXJyZW50IGxvY2F0aW9uIGJ5IGRlZmF1bHRcclxuICAgICAgICBjb25zdCBleGlzdGluZ0hhc2ggPSB3aW5kb3cubG9jYXRpb24uaGFzaDtcclxuICAgICAgICBsZXQgcGF0aERlZmF1bHQgPSB3aW5kb3cubG9jYXRpb24uaHJlZjtcclxuXHJcbiAgICAgICAgLy8gUmVtb3ZlIG5vdCBuZWVkZWQgcGFydHMgZnJvbSB1cmxzLlxyXG4gICAgICAgIGlmIChleGlzdGluZ0hhc2gpIHtcclxuICAgICAgICAgICAgcGF0aERlZmF1bHQgPSBwYXRoRGVmYXVsdC5yZXBsYWNlKGV4aXN0aW5nSGFzaCwgJycpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHBhdGhEZWZhdWx0LnN1YnN0cigtMSkgPT09ICcjJykge1xyXG4gICAgICAgICAgICBwYXRoRGVmYXVsdCA9IHBhdGhEZWZhdWx0LnNsaWNlKDAsIC0xKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuY29uZmlnLnJlZGlyZWN0VXJpID0gY29uZmlnLnJlZGlyZWN0VXJpIHx8IHBhdGhEZWZhdWx0O1xyXG5cclxuICAgICAgICByZXR1cm4gY29uZmlnO1xyXG4gICAgfTtcclxuXHJcbiAgICBwdWJsaWMgaXNBdXRoZW50aWNhdGVkID0gKCk6IGJvb2xlYW4gPT4ge1xyXG4gICAgICAgIHJldHVybiA8YW55PnRoaXMub0F1dGhUb2tlblNlcnZpY2UuZ2V0VG9rZW4oKTtcclxuICAgIH07XHJcblxyXG4gICAgcHVibGljIGxvZ2luID0gKCk6IHZvaWQgPT4ge1xyXG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gdGhpcy5nZXRSZWRpcmVjdFVybCgpO1xyXG4gICAgfTtcclxuXHJcbiAgICBwdWJsaWMgbG9nb3V0ID0gKCk6IHZvaWQgPT4ge1xyXG4gICAgICAgIGNvbnN0IHJlZGlyZWN0VXJsID0gYCR7dGhpcy5jb25maWcubG9nb3V0VXJsfT9gICtcclxuICAgICAgICAgICAgYCR7dGhpcy5jb25maWcubG9nb3V0UmVkaXJlY3RQYXJhbWV0ZXJOYW1lfT0ke2VuY29kZVVSSUNvbXBvbmVudCh0aGlzLmNvbmZpZy5yZWRpcmVjdFVyaSl9YDtcclxuXHJcbiAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSByZWRpcmVjdFVybDtcclxuICAgICAgICB0aGlzLm9BdXRoVG9rZW5TZXJ2aWNlLnJlbW92ZVRva2VuKCk7XHJcbiAgICB9O1xyXG5cclxuICAgIHB1YmxpYyBsb2dpbk9uU3RhdGVDaGFuZ2UgPSAodG9TdGF0ZSk6IGJvb2xlYW4gPT4ge1xyXG4gICAgICAgIGlmICh0b1N0YXRlICYmIHRoaXMuaXNMb2dpblJlcXVpcmVkKHRvU3RhdGUpICYmICF0aGlzLmlzQXV0aGVudGljYXRlZCgpICYmICF0aGlzLmdldFRva2VuRGF0YUZyb21VcmwoKSkge1xyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMubG9jYWxTdG9yYWdlU2VydmljZS5pc1N0b3JhZ2VTdXBwb3J0ZWQoKSkge1xyXG4gICAgICAgICAgICAgICAgbGV0IHVybCA9IHdpbmRvdy5sb2NhdGlvbi5ocmVmO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmICghd2luZG93LmxvY2F0aW9uLmhhc2gpIHtcclxuICAgICAgICAgICAgICAgICAgICB1cmwgPSB0aGlzLmdldEJhc2VSb3V0ZVVybCgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMubG9jYWxTdG9yYWdlU2VydmljZS5zZXQ8c3RyaW5nPihPQVVUSF9TVEFSVFBBR0VfU1RPUkFHRV9LRVksIHVybCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMubG9naW4oKTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfTtcclxuXHJcbiAgICBwdWJsaWMgc2V0VG9rZW5PblJlZGlyZWN0ID0gKCk6IHZvaWQgPT4ge1xyXG4gICAgICAgIGNvbnN0IHRva2VuRGF0YSA9IHRoaXMuZ2V0VG9rZW5EYXRhRnJvbVVybCgpO1xyXG5cclxuICAgICAgICBpZiAoIXRoaXMuaXNBdXRoZW50aWNhdGVkKCkgJiYgdG9rZW5EYXRhKSB7XHJcbiAgICAgICAgICAgIHRoaXMub0F1dGhUb2tlblNlcnZpY2Uuc2V0VG9rZW4odG9rZW5EYXRhKTtcclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLmxvY2FsU3RvcmFnZVNlcnZpY2UuaXNTdG9yYWdlU3VwcG9ydGVkKCkgJiYgdGhpcy5sb2NhbFN0b3JhZ2VTZXJ2aWNlLmdldChPQVVUSF9TVEFSVFBBR0VfU1RPUkFHRV9LRVkpKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBzdGFydFBhZ2UgPSB0aGlzLmxvY2FsU3RvcmFnZVNlcnZpY2UuZ2V0PHN0cmluZz4oT0FVVEhfU1RBUlRQQUdFX1NUT1JBR0VfS0VZKTtcclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLmxvY2FsU3RvcmFnZVNlcnZpY2UucmVtb3ZlKE9BVVRIX1NUQVJUUEFHRV9TVE9SQUdFX0tFWSk7XHJcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IHN0YXJ0UGFnZTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIC8vIFJlZGlyZWN0IHRvIHRoZSBiYXNlIGFwcGxpY2F0aW9uIHJvdXRlXHJcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IHRoaXMuZ2V0QmFzZVJvdXRlVXJsKCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMuZXZlbnRBZ2dyZWdhdG9yLnB1Ymxpc2goT0F1dGhTZXJ2aWNlLkxPR0lOX1NVQ0NFU1NfRVZFTlQsIHRva2VuRGF0YSk7XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5jb25maWcuYXV0b1Rva2VuUmVuZXdhbCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zZXRBdXRvbWF0aWNUb2tlblJlbmV3YWwoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgcHJpdmF0ZSBpc0xvZ2luUmVxdWlyZWQgPSAoc3RhdGUpOiBib29sZWFuID0+IHtcclxuICAgICAgICBjb25zdCByb3V0ZUhhc0NvbmZpZyA9IHN0YXRlLnNldHRpbmdzICYmIHN0YXRlLnNldHRpbmdzLnJlcXVpcmVMb2dpbiAhPT0gdW5kZWZpbmVkO1xyXG4gICAgICAgIGNvbnN0IHJvdXRlUmVxdWlyZXNMb2dpbiA9IHJvdXRlSGFzQ29uZmlnICYmIHN0YXRlLnNldHRpbmdzLnJlcXVpcmVMb2dpbiA/IHRydWUgOiBmYWxzZTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHJvdXRlSGFzQ29uZmlnID8gcm91dGVSZXF1aXJlc0xvZ2luIDogdGhpcy5jb25maWcuYWx3YXlzUmVxdWlyZUxvZ2luO1xyXG4gICAgfTtcclxuXHJcbiAgICBwcml2YXRlIGdldFRva2VuRGF0YUZyb21VcmwgPSAoaGFzaD86IHN0cmluZyk6IE9BdXRoVG9rZW5EYXRhID0+IHtcclxuICAgICAgICBjb25zdCBoYXNoRGF0YSA9IHRoaXMudXJsSGFzaFNlcnZpY2UuZ2V0SGFzaERhdGEoaGFzaCk7XHJcbiAgICAgICAgY29uc3QgdG9rZW5EYXRhID0gdGhpcy5vQXV0aFRva2VuU2VydmljZS5jcmVhdGVUb2tlbihoYXNoRGF0YSk7XHJcblxyXG4gICAgICAgIHJldHVybiB0b2tlbkRhdGE7XHJcbiAgICB9O1xyXG5cclxuICAgIHByaXZhdGUgZ2V0QmFzZVJvdXRlVXJsID0gKCk6IHN0cmluZyA9PiB7XHJcbiAgICAgICAgcmV0dXJuIHdpbmRvdy5sb2NhdGlvbi5vcmlnaW4gKyAnLyMvJztcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGdldFNpbXBsZU5vbmNlVmFsdWUgPSAoKTogc3RyaW5nID0+IHtcclxuICAgICAgICByZXR1cm4gKChEYXRlLm5vdygpICsgTWF0aC5yYW5kb20oKSkgKiBNYXRoLnJhbmRvbSgpKS50b1N0cmluZygpLnJlcGxhY2UoJy4nLCAnJyk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXRSZWRpcmVjdFVybCgpIHtcclxuICAgICAgICBsZXQgcmVkaXJlY3RVcmwgPSBgJHt0aGlzLmNvbmZpZy5sb2dpblVybH0/YCArXHJcbiAgICAgICAgICAgIGByZXNwb25zZV90eXBlPSR7dGhpcy5vQXV0aFRva2VuU2VydmljZS5jb25maWcubmFtZX0mYCArXHJcbiAgICAgICAgICAgIGBjbGllbnRfaWQ9JHtlbmNvZGVVUklDb21wb25lbnQodGhpcy5jb25maWcuY2xpZW50SWQpfSZgICtcclxuICAgICAgICAgICAgYHJlZGlyZWN0X3VyaT0ke2VuY29kZVVSSUNvbXBvbmVudCh0aGlzLmNvbmZpZy5yZWRpcmVjdFVyaSl9JmAgK1xyXG4gICAgICAgICAgICBgbm9uY2U9JHtlbmNvZGVVUklDb21wb25lbnQodGhpcy5nZXRTaW1wbGVOb25jZVZhbHVlKCkpfWA7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmNvbmZpZy5zY29wZSkge1xyXG4gICAgICAgICAgICByZWRpcmVjdFVybCArPSBgJnNjb3BlPSR7ZW5jb2RlVVJJQ29tcG9uZW50KHRoaXMuY29uZmlnLnNjb3BlKX1gO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuY29uZmlnLnJlc291cmNlKSB7XHJcbiAgICAgICAgICAgIHJlZGlyZWN0VXJsICs9IGAmcmVzb3VyY2U9JHtlbmNvZGVVUklDb21wb25lbnQodGhpcy5jb25maWcucmVzb3VyY2UpfWA7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5jb25maWcuc3RhdGUpIHtcclxuICAgICAgICAgICAgcmVkaXJlY3RVcmwgKz0gYCZzdGF0ZT0ke2VuY29kZVVSSUNvbXBvbmVudCh0aGlzLmNvbmZpZy5zdGF0ZSl9YDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiByZWRpcmVjdFVybDtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHNldEF1dG9tYXRpY1Rva2VuUmVuZXdhbCgpIHtcclxuICAgICAgICBjb25zdCB0b2tlbkV4cGlyYXRpb25UaW1lID0gdGhpcy5vQXV0aFRva2VuU2VydmljZS5nZXRUb2tlbkV4cGlyYXRpb25UaW1lKCkgKiAxMDAwO1xyXG5cclxuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgY29uc3QgaUZyYW1lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaWZyYW1lJyk7XHJcbiAgICAgICAgICAgIGlGcmFtZS5zcmMgPSB0aGlzLmdldFJlZGlyZWN0VXJsKCk7XHJcbiAgICAgICAgICAgIGlGcmFtZS5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xyXG4gICAgICAgICAgICBpRnJhbWUub25sb2FkID0gKGV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGhhc2hXaXRoTmV3VG9rZW4gPSBpRnJhbWUuY29udGVudFdpbmRvdy5sb2NhdGlvbi5oYXNoO1xyXG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQoaUZyYW1lKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdG9rZW5EYXRhID0gdGhpcy5nZXRUb2tlbkRhdGFGcm9tVXJsKGhhc2hXaXRoTmV3VG9rZW4pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAodG9rZW5EYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMub0F1dGhUb2tlblNlcnZpY2Uuc2V0VG9rZW4odG9rZW5EYXRhKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRBdXRvbWF0aWNUb2tlblJlbmV3YWwoKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChleCkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGlGcmFtZS5jb250ZW50V2luZG93IGNhbiBmYWlsIHdoZW4gYW4gaWZyYW1lIGxvYWRzIGlkZW50aXR5IHNlcnZlciBsb2dpbiBwYWdlXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gYnV0IHRoaXMgcGFnZSB3aWxsIG5vdCByZWRpcmVjdCBiYWNrIHRvIHRoZSBhcHAgdXJsIHdhaXRpbmcgZm9yIHRoZSB1c2VyIHRvIGxvZ2luIGluXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gdGhpcyBiZWhhdmlvdXIgbXkgb2NjdXIgaS5lLiB3aGVuIGxvZ2luIHBhZ2UgYXV0aGVudGljYXRpb24gY29va2llcyBleHBpcmVcclxuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKGlGcmFtZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGlGcmFtZSk7XHJcbiAgICAgICAgfSwgdG9rZW5FeHBpcmF0aW9uVGltZSk7XHJcbiAgICB9XHJcbn1cclxuIl19
