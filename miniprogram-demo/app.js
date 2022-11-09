// app.js
import turbo from "./utils/turbo.min.js"
App({
  onLaunch() {
    turbo.setPara({
      show_log: false
    })
    turbo.init('gZGljPsq7I4wc3BMvkAUsevQznx1jahi', "your_client_id");
  },
  globalData: {}
})