
var ___track = function(action) {
  if (!_gaq) {
	  return
	}

  var pathname = window.location.pathname
  if (pathname.lastIndexOf("/") === pathname.length - 1) {
    pathname = pathname.substring(0, pathname.length - 1)
  }
  var track_url = pathname +'/track/action/'+ action
  
  console.log(track_url)

  _gaq.push(['_trackPageview', track_url])
}

var validateForm = function(form) {
  var required = form.select('*[required]')

  var errors = required.select(function(element) {
    var requirement = element.readAttribute('required')
    var emailRegexp = /^[^@\s]+@(?:[^@\s.]+\.)+[a-z]{2,}$/i

    if (element.value.blank()) {
      return element
    }

    if (requirement == 'email') {
      element.value = element.value.strip()
      if (!element.value.match(emailRegexp)) {
        return element
      }
    }
  })

  return errors.any() ? errors : null
}

var clearErrorMessages = function(form) {
  form.select(".error_message").invoke('hide')
  form.select(".invalid").invoke('removeClassName', 'invalid')
}

var displayErrorMessageFor = function(input) {
  input.addClassName("invalid")

  var element = $(input.id + "_error_message")
  if (element) element.setStyle({ display: "block" })
}

var submit_email = function(form_id, form, event, callback) {
  clearErrorMessages(form)

  var errors = validateForm(form)
  event.stop()
  if (errors) {
    errors.each(function(element) { 
      displayErrorMessageFor(element)
    })
  } else {
    
    $(form_id).request({
      onFailure: function() { },
      onSuccess: function(response) {
        if (response.status !== 200) {
          return
        }
        
        if (!response.responseText.evalJSON().success) {
          return
        }

        if (callback) {
          callback()
        }
      }
    });
  }
}
