$(function() {
  $('#posts').load('/ajax/posts');

  setInterval(function() {
    console.log('loading posts');
    $('#posts').load('/ajax/posts');
  }, 5000);
});
