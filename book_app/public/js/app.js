'use strict'; // and we're ready...

$(document).ready(function() {
  $('#updatebook').hide();
})

$('.updatebutton').click(function(event) {
  event.preventDefault();
  $('#updatebook').toggle();
  console.log('howdy!');
});

