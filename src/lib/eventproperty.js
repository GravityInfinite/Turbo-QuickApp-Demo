export const eventProperty = {
  properties: {
    $lib: "QuickApp",
    $lib_version: "3.3.2",
  },
  getOtherAfterNative: async function () {
    const first_visit_day = await storage.get({
      key: "first_visit_day",
    });
    this.properties.$app_id = app.getInfo().packageName;
    this.properties.$is_first_day =
      first_visit_day.data === new Date().toLocaleDateString();
  },
  getSystem: function () {
    var t = this.properties;
    device.getInfo({
      success: function (e) {
        t.$screen_height = Number(e.screenHeight);
        t.$screen_width = Number(e.screenWidth);
        t.$model = e.model;
        t.$manufacturer = e.manufacturer;
        t.$os = e.osType;
        t.$os_version = e.osVersionName;
      },
    });
  },
  getNetwork: function () {
    var t = this.properties;
    return new Promise(function (resolve, reject) {
      network.getType({
        success: function (e) {
          t.$network_type = e.type;
          resolve(e);
        },
      });
    });
  },
  getAppInfoSync: function () {
    if (wx.getAccountInfoSync) {
      const info = wx.getAccountInfoSync(),
        accountInfo = info && info.miniProgram ? info.miniProgram : {};
      const temp_appinfo = {
        $app_id: accountInfo.appId,
      };
      for (let item in temp_appinfo) {
        if (temp_appinfo.hasOwnProperty(item)) {
          this.properties[item] = temp_appinfo[item];
        }
      }
      return temp_appinfo;
    }
    return {};
  },
  infoInit: async function () {
    await this.getOtherAfterNative();
    this.getSystem();
    this.getNetwork();
  },
  getProperties: function () {
    return this.properties;
  },
};
