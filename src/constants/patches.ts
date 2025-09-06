export const KLITE_CSS_OVERRIDE = `
<style id="gerbil-css-override">
* {
  transition: 100ms ease all;
}

.maincontainer {
  padding-right: 0 !important;
  padding-left: 0 !important;
}

.adaptivecontainer {
  width: 100% !important;
}

#lastreq1 {
  margin: 0 10px;
}

#inputrow {
  padding: 0 10px;
}

#actionmenuitems {
  margin-left: 10px;
}

.topmenu {
  padding: 10px;
}

#navbarNavDropdown {
  padding: 0;
}

#inputrow > :nth-child(1) {
  padding-right: 0 !important;
}
#inputrow.show_mode > :nth-child(1) {
  flex: 0 0 70px;
  margin-right: 4px;
}
#inputrow > :nth-child(3) {
  flex: 0 0 70px;
  padding-right: 0 !important;
}
#inputrow.show_mode > :nth-child(3) button {
  background-color: #129c00;
  font-size: 14px;
}
#inputrow.show_mode > :nth-child(3) button:hover {
  background-color: #058105;
}

#actionmenuitems + div {
  margin-right: 10px;
}

#actionmenuitems button, #actionmenuitems2 button {
  background-color: #337ab7 !important;
}
#actionmenuitems button:hover, #actionmenuitems2 button:hover {
  background-color: #286090 !important;
}
</style>`;

export const KLITE_AUTOSCROLL_PATCHES = `
<script id="gerbil-autoscroll-patches">
(function() {
  'use strict';
  
  window.handle_autoscroll = function(alwaysscroll = true) {
    if (localsettings.autoscroll) {
      let box1 = document.getElementById("gametext");
      let box2 = document.getElementById("chat_msg_body");
      let box3 = document.getElementById("corpostylemain");
      
      function isScrolledToBottom(element) {
        return element.scrollHeight - element.scrollTop <= element.clientHeight + 250;
      }
      
      function shouldRespectUserScroll(element) {
        return (element.scrollHeight - element.scrollTop - element.clientHeight) > 50;
      }
      
      if((alwaysscroll && !shouldRespectUserScroll(box1)) || isScrolledToBottom(box1)) {
        box1.scrollTop = box1.scrollHeight - box1.clientHeight + 10;
      }
      if((alwaysscroll && !shouldRespectUserScroll(box2)) || isScrolledToBottom(box2)) {
        box2.scrollTop = box2.scrollHeight - box2.clientHeight + 10;
      }
      if((alwaysscroll && !shouldRespectUserScroll(box3)) || isScrolledToBottom(box3)) {
        box3.scrollTop = box3.scrollHeight - box3.clientHeight + 10;
      }
    }
  };
  
  window.update_pending_stream_displays = function() {
    var elements = document.querySelectorAll(".pending_text");

    if(elements && elements.length > 0) {
      let onboundary = false;
      if(gametext_arr.length > 0 && gametext_arr[gametext_arr.length-1].trim().endsWith("{{[OUTPUT]}}")) {
        onboundary = true;
      }
      elements.forEach(function (element) {
        let temp_stream = synchro_pending_stream;
        if (onboundary) {
          let codeblockcount = (temp_stream.match(/\`\`\`/g) || []).length;
          if (codeblockcount > 0 && codeblockcount % 2 != 0) {
            temp_stream += "\`\`\`"; // force end code block
          }
        }
        let pend = escape_html(pending_context_preinjection) + format_streaming_text(escape_html(temp_stream));
        element.innerHTML = pend;
      });
    } else {
      render_gametext(false);
    }

    let shouldSkipAutoscroll = false;
    ["gametext", "chat_msg_body", "corpostylemain"].forEach(id => {
      let el = document.getElementById(id);
      if (el && (el.scrollHeight - el.scrollTop - el.clientHeight) > 50) {
        shouldSkipAutoscroll = true;
      }
    });
    
    if (!shouldSkipAutoscroll) {
      handle_autoscroll(false);
    }
  };
})();
</script>`;
