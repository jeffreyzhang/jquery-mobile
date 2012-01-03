/*
* "transitions" plugin - Page change tranistions
*/

(function( $, window, undefined ) {

function css3TransitionHandler( name, reverse, $to, $from ) {

	var deferred = new $.Deferred(),
		reverseClass = reverse ? " reverse" : "",
		viewportClass = "ui-mobile-viewport-transitioning viewport-" + name,
		doneFunc = function() {

			$to.add( $from ).removeClass( "out in reverse " + name );			

			if ( $from && $from[ 0 ] !== $to[ 0 ] ) {
				$from.removeClass( $.mobile.activePageClass );
			}

			$to.parent().removeClass( viewportClass );

			deferred.resolve( name, reverse, $to, $from );
		};

	$to.animationComplete( doneFunc );

	$to.parent().addClass( viewportClass );

	if ( $from ) {
		if ( $from.jqmData('role') === "dialog" ) {
			// Transitioning away from a dialog.
			
			$from.addClass( "fade out" + reverseClass );			
			$to.addClass( $.mobile.activePageClass + " fade out" + reverseClass);
		} else {
			// Transitioning away from a normal page.
			$from.addClass( name + " out" + reverseClass );
		}
	}
	
	if ( $to.jqmData('role') === "dialog" ) {
		// Transitioning to a dialog.
		
		// Fade in the dialog overlay:
		$to.addClass( $.mobile.activePageClass + " fade in" + reverseClass );
		
		// Apply the set transition to the dialog itself:
		$(":first", $to).addClass( name + " in" + reverseClass );
		
	} else if( $from.jqmData('role') !== 'dialog' ){
		// Transition has nothing to do with a dialog.
		$to.addClass( $.mobile.activePageClass + " " + name + " in" + reverseClass );
	}



	return deferred.promise();
}

// Make our transition handler public.
$.mobile.css3TransitionHandler = css3TransitionHandler;

// If the default transition handler is the 'none' handler, replace it with our handler.
if ( $.mobile.defaultTransitionHandler === $.mobile.noneTransitionHandler ) {
	$.mobile.defaultTransitionHandler = css3TransitionHandler;
}

})( jQuery, this );