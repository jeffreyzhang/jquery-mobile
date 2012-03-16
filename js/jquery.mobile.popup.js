//>>excludeStart("jqmBuildExclude", pragmas.jqmBuildExclude);
//>>description: Popup windows.
//>>label: Popups

define( [ "jquery",
	"jquery.mobile.widget",
	"jquery.mobile.navigation",
	"../external/requirejs/depend!./jquery.mobile.hashchange[jquery]" ], function( $ ) {
//>>excludeEnd("jqmBuildExclude");
(function( $, undefined ) {

	// Configure whether popups set only one history entry for all popups on the page, or whether each popup advances the
	// history by setting
	//   $.mobile.popupsHaveOneHistoryEntry = true;
	// By default, each popup advances the history

	var popupStack = $.extend( {
				// Common routines

				_stack : [],

				push: function( popup ) {
					if ( 0 === this._stack.length ) {
						var self = this;

						$( window ).bind( "pagebeforechange.popupStack", function( e, data ) {
							if ( typeof( data.toPage ) === "object" && data.toPage.jqmData( "url" ) !== $.mobile.activePage.jqmData( "url" ) ) {
								// prevent the changePage from happening
								e.preventDefault();
								e.stopImmediatePropagation();

								self._closeAllPopups( function() {
									// Resume the changePage
									$.mobile.changePage( data.toPage, data.options );
								});
							}
						});
					}

					this._push( popup );
				},

				pop: function( popup ) {
					// If we're popping the last popup, get rid of the pagebeforechange handler
					if ( 1 === this._stack.length && popup === this._stack[ 0 ] ) {
						$( window ).unbind( "pagebeforechange.popupStack" );
					}
					this._pop( popup );
				},

				_getPathPrefix: function() {
					var ret = "";

					if ( $.mobile.activePage != $.mobile.firstPage ) {
						var activeEntry = $.mobile.urlHistory.getActive(),
								activeUrl = activeEntry.url;

						// If the hash is of the form "/some/path/to/some/file" then we only need to keep it if the location's
						// pathname is not the same.
						//
						// I have seen locations like this:
						// http://server/path/to/filename.html#/path/to/filename.html
						// In this case, we don't need to keep the path following the hash
						if ( activeUrl.substr( 0, 1 ) != "/" || activeUrl != location.pathname ) {
							ret = activeUrl;
						}
					}

					return ret;
				},

				_setPath: function( newPath ) {
					var self = this;

					// listen for hashchange that will occur when we set it to null dialog hash
					if ( newPath != $.mobile.path.get() ) {
						// Pushing this newPath will result in a hashchange, so attach then
						$( window ).one( "hashchange", function() {
							self._bindHashChange();
						} );
					}
					else {
						// Pushing this newPath will not result in a hashchange, so attach directly
						this._bindHashChange();
					}

					// set hash to non-linkable dialog url
					$.mobile.path.set( newPath );
				}
			}, ( $.mobile.popupsHaveOneHistoryEntry
				// One history entry for all popups
				? {
					_bindHashChange: function() {
						var self = this;
						$( window ).one( "hashchange.popupStack", function() {
							$.each( self._stack, function( key, value ) {
								value._realClose();
							});
							self._stack = [];
							$( window ).unbind( "pagebeforechange.popupStack" );
							if ( self._closeAllPopups.doneCB ) {
								self._closeAllPopups.doneCB();
								self._closeAllPopups.doneCB = undefined;
							}
						});
					},

					_closeAllPopups: function ( doneCB ) {
						if ( this._stack.length > 0 ) {
							this._closeAllPopups.doneCB = doneCB;
							window.history.back();
						}
					},

					_push: function( popup ) {
						if ( this._stack.length === 0 ) {
							this._setPath( this._getPathPrefix() + $.mobile.dialogHashKey );
						}
						this._stack.push( popup );
					},

					_pop: function( popup ) {
						var idx = this._stack.indexOf( popup );

						if ( idx < 0 ) {
							popup._realClose();
						}
						else
						if ( this._stack.length === 1 ) {
							window.history.back();
						}
						else {
							this._stack.splice( idx, 1 );
							popup._realClose();
						}
					}
				}
				// One history entry per popup
				: {
					_bindHashChange: function() {
						var self = this;
						$( window ).one( "hashchange.popupStack", function() {
							if ( self._stack.length >= 1 ) {
								self._stack.pop()._realClose();
							}

							if ( self._stack.length > 0 ) {
								self._bindHashChange();
							}
							else
							if ( self._closeAllPopups.doneCB ) {
								self._closeAllPopups.doneCB();
								self._closeAllPopups.doneCB = undefined;
							}

							if ( self._closeAllPopups.doneCB && self._stack.length > 0 ) {
								self.pop( self._stack [ self._stack.length - 1 ] );
							}
						} );
					},

					_closeAllPopups: function( doneCB ) {
						if ( this._stack.length > 0 ) {
							this._closeAllPopups.doneCB = doneCB;
							this.pop( this._stack[ this._stack.length - 1 ] );
						}
					},

					_push: function(popup) {
						if ( this._stack.length > 0 ) {
							$( window ).unbind( "hashchange.popupStack" );
						}
						this._stack.push( popup );
						this._setPath( this._getPathPrefix() + "&jqmNPopups=" + this._stack.length );
					},

					_pop: function( popup ) {
						var self = this,
								idx = this._stack.indexOf( popup );

						if ( idx < 0 ) {
							popup._realClose();
						}
						else
						if ( idx === this._stack.length - 1 ) {
							window.history.back();
						}
						else {
							this._stack.splice( idx, 1 );
							popup._realClose();
							$( window ).unbind( "hashchange.popupStack" );
							$( window ).one( "hashchange", function() {
								self._bindHashChange();
							});
							window.history.back();
						}
					}
				}));

	$.widget( "mobile.popup", $.mobile.widget, {
		options: {
			theme: null,
			overlayTheme: null,
			shadow: true,
			corners: true,
			fade: true,
			transition: $.mobile.defaultDialogTransition,
			initSelector: ":jqmData(role='popup')"
		},

		_create: function() {
			var ui = {
					screen: "#ui-popup-screen",
					container: "#ui-popup-container"
				},
				proto = $(
					"<div>" +
					"    <div id='ui-popup-screen' class='ui-selectmenu-screen ui-screen-hidden ui-popup-screen'></div>" +
					"    <div id='ui-popup-container' class='ui-popup-container ui-selectmenu-hidden'></div>" +
					"</div>"
				),
				thisPage = this.element.closest( ":jqmData(role='page')" ),
				self = this;

			if ( thisPage.length === 0 ) {
				thisPage = $( "body" );
			}

			// Assign the relevant parts of the proto
			for ( var key in ui ) {
				ui[ key ] = proto.find( ui[ key ] ).removeAttr( "id" );
			}

			// Apply the proto
			thisPage.append( ui.screen );
			ui.container.insertAfter( ui.screen );
			ui.container.append( this.element );

			// Define instance variables
			$.extend( this, {
				_ui: ui,
				_isOpen: false
			});

			$.each( this.options, function( key ) {
				// Cause initial options to be applied by their handler by temporarily setting the option to undefined
				// - the handler then sets it to the initial value
				var value = self.options[ key ];

				self.options[ key ] = undefined;
				self._setOption( key, value, true );
			});

			ui.screen.bind( "vclick", function( e ) {
				e.preventDefault();
				e.stopImmediatePropagation();
				self.close();
			});
		},

		_realSetTheme: function( dst, theme ) {
			var classes = ( dst.attr( "class" ) || "").split( " " ),
				alreadyAdded = true,
				currentTheme = null,
				matches;

			theme = String( theme );
			while ( classes.length > 0 ) {
				currentTheme = classes.pop();
				matches = currentTheme.match( /^ui-body-([a-z])$/ );
				if ( matches && matches.length > 1 ) {
					currentTheme = matches[ 1 ];
					break;
				}
				else {
					currentTheme = null;
				}
			}

			if ( theme !== currentTheme ) {
				dst.removeClass( "ui-body-" + currentTheme );
				if ( theme !== null ) {
					dst.addClass( "ui-body-" + theme );
				}
			}
		},

		_setTheme: function( value ) {
			this._realSetTheme( this.element, value );
			this.options.theme = value;
			this.element.attr( "data-" + ( $.mobile.ns || "" ) + "theme", value );
		},

		_setOverlayTheme: function( value ) {
			this._realSetTheme( this._ui.container, value );
			// The screen must always have some kind of background for fade to work, so, if the theme is being unset,
			// set the background to "a".
			this._realSetTheme( this._ui.screen, (value === "" ? "a" : value) );
			this.options.overlayTheme = value;
			this.element.attr( "data-" + ( $.mobile.ns || "" ) + "overlay-theme", value );
		},

		_setShadow: function( value ) {
			this._ui.container[value ? "addClass" : "removeClass"]( "ui-overlay-shadow" );
			this.options.shadow = value;
			this.element.attr( "data-" + ( $.mobile.ns || "" ) + "shadow", value );
		},

		_setCorners: function( value ) {
			this._ui.container[ value ? "addClass" : "removeClass" ]( "ui-corner-all" );
			this.options.corners = value;
			this.element.attr( "data-" + ( $.mobile.ns || "" ) + "corners", value );
		},

		_setFade: function( value ) {
			this.options.fade = value;
			this.element.attr( "data-" + ( $.mobile.ns || "" ) + "fade", value );
		},

		_setTransition: function( value ) {
			this._ui.container.removeClass( this.options.transition || "" );
			if ( value && value !== "none" ) {
				this._ui.container.addClass( value );
			}
			this.options.transition = value;
			this.element.attr( "data-" + ( $.mobile.ns || "" ) + "transition", value );
		},

		_setOption: function( key, value ) {
			var setter = "_set" + key.replace( /^[a-z]/, function( c ) {
				return c.toUpperCase();
			});

			if ( this[ setter ] !== undefined ) {
				this[ setter ]( value );
			}
			else {
				$.mobile.widget.prototype._setOption.apply( this, arguments );
			}
		},

		_placementCoords: function( x, y ) {
			// Try and center the overlay over the given coordinates
			var ret,
				menuHeight = this._ui.container.outerHeight( true ),
				menuWidth = this._ui.container.outerWidth( true ),
				scrollTop = $( window ).scrollTop(),
				screenHeight = $( window ).height(),
				screenWidth = $( window ).width(),
				halfheight = menuHeight / 2,
				maxwidth = parseFloat( this._ui.container.css( "max-width" ) ),
				roomtop = y - scrollTop,
				roombot = scrollTop + screenHeight - y,
				newtop, newleft;

			if ( roomtop > menuHeight / 2 && roombot > menuHeight / 2 ) {
				newtop = y - halfheight;
			}
			else {
				// 30px tolerance off the edges
				newtop = roomtop > roombot ? scrollTop + screenHeight - menuHeight - 30 : scrollTop + 30;
			}

			// If the menuwidth is smaller than the screen center is
			if ( menuWidth < maxwidth ) {
				newleft = ( screenWidth - menuWidth ) / 2;
			}
			else {
				//otherwise insure a >= 30px offset from the left
				newleft = x - menuWidth / 2;

				// 10px tolerance off the edges
				if ( newleft < 10 ) {
					newleft = 10;
				}
				else
				if ( ( newleft + menuWidth ) > screenWidth ) {
					newleft = screenWidth - menuWidth - 10;
				}
			}

			return { x: newleft, y: newtop };
		},

		open: function( x, y ) {
			if ( !this._isOpen ) {
				var self = this,
					onAnimationComplete = function() {
						self._ui.screen.height( $( document ).height() );
					},
					coords = this._placementCoords(
							( undefined === x ? window.innerWidth / 2 : x ),
							( undefined === y ? window.innerHeight / 2 : y ) );

				this._ui.screen
						.height( $( document ).height() )
						.removeClass( "ui-screen-hidden" );

				if ( this.options.fade ) {
					this._ui.screen.animate( { opacity: 0.5 }, "fast" );
				}

				this._ui.container
					.removeClass( "ui-selectmenu-hidden" )
					.css( {
						left: coords.x,
						top: coords.y
					});

				if ( this.options.transition && this.options.transition !== "none" ) {
					this._ui.container
						.addClass( "in" )
						.animationComplete( onAnimationComplete );
				} else {
					onAnimationComplete();
				}

				popupStack.push( this );
				this._isOpen = true;
			}
		},

		close: function() {
			popupStack.pop( this );
		},

		_realClose: function() {
			if ( this._isOpen ) {
				var self = this,
					onAnimationComplete = function() {
						self._ui.container
							.removeClass( "reverse out" )
							.addClass( "ui-selectmenu-hidden" )
							.removeAttr( "style" );
					},
					hideScreen = function() {
						self._ui.screen.addClass( "ui-screen-hidden" );
						self._isOpen = false;
						self.element.trigger( "closed" );
						self._ui.screen.removeAttr( "style" );
					};

				if ( this.options.transition && this.options.transition !== "none" ) {
					this._ui.container
						.removeClass( "in" )
						.addClass( "reverse out" )
						.animationComplete( onAnimationComplete );
				} else {
					onAnimationComplete();
				}

				if ( this.options.fade ) {
					this._ui.screen.animate( { opacity: 0.0 }, "fast", hideScreen );
				}
				else {
					hideScreen();
				}
			}
		}
	});

	$.mobile.popup.bindPopupToButton = function( btn, popup ) {
		if ( btn.length === 0 || popup.length === 0 ) return;

		var btnVClickHandler = function( e ) {
			// When /this/ button causes a popup, align the popup's theme with that of the button, unless the popup has a theme pre-set
			if ( !popup.jqmData( "overlay-theme-set" ) ) {
				popup.popup( "option", "overlayTheme", btn.jqmData( "theme" ) );
			}
			popup.popup( "open",
					btn.offset().left + btn.outerWidth() / 2,
					btn.offset().top + btn.outerHeight() / 2 );

			// Swallow event, because it might end up getting picked up by the popup window's screen handler, which
			// will in turn cause the popup window to close - Thanks Sasha!
			if ( e.stopPropagation ) {
				e.stopPropagation();
			}
			if ( e.preventDefault ) {
				e.preventDefault();
			}
		};

		// If the popup has a theme set, prevent it from being clobbered by the associated button
		if ( (popup.popup( "option", "overlayTheme" ) || "").match( /[a-z]/ ) ) {
			popup.jqmData( "overlay-theme-set", true );
		}

		btn.attr( {
			"aria-haspopup": true,
			"aria-owns": btn.attr( "href" )
		})
			.removeAttr( "href" )
			.bind( "vclick", btnVClickHandler );
	};

	$( document ).bind( "pagecreate create", function( e )  {
		$( $.mobile.popup.prototype.options.initSelector, e.target )
				.not( ":jqmData(role='none'), :jqmData(role='nojs')" )
				.popup();

		$( "a[href^='#']:jqmData(rel='popup')", e.target ).each( function() {
			$.mobile.popup.bindPopupToButton( $( this ), $( $( this ).attr( "href" ) ) );
		});
	});

})( jQuery );
//>>excludeStart("jqmBuildExclude", pragmas.jqmBuildExclude);
});
//>>excludeEnd("jqmBuildExclude");
