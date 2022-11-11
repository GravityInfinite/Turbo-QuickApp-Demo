import storage from "@system.storage";
import fetch from "@system.fetch";
import device from "@system.device";
import network from "@system.network";
import router from "@system.router";
import app from "@system.app";

function globalChecked() {
  if (!turbo?._globalData?.access_token) {
    throw new Error("access_token is missing, you must call init first.");
  }
  if (!turbo?._globalData?.client_id) {
    throw new Error("client_id is missing, you must call init first.");
  }
}

const turbo = {
  register: function (e = {}) {
    globalChecked();
    if (!e?.name) {
      throw new Error("name must be required");
    }
    if (!e?.channel) {
      throw new Error("channel must be required");
    }
    if (!e?.version && e?.version !== 0) {
      throw new Error("version must be required");
    }
    if (!isNumber(e?.version) || typeof e?.version !== "number") {
      throw new Error("version must be type: Number");
    }
    const data = {
      client_id: turbo._globalData.client_id,
      name: e.name,
      channel: e.channel,
      version: e.version,
      media_type: "quick",
      wx_openid: "",
      wx_unionid: "",
      click_id: "",
      ad_data: {},
    };
    return new Promise(function (resolve, reject) {
      fetch.fetch({
        url: `${baseurl}/user/register/?access_token=${turbo._globalData.access_token}`,
        method: "POST",
        header,
        data,
        success(res) {
          if (res.statusCode === 200) {
            turbo.profileSetOnce({
              $signup_time: new Date()
                .toLocaleString("cn", {
                  hour12: false,
                })
                .replaceAll("/", "-"),
            });
            resolve(res.data);
            return;
          }
          reject(res);
        },
        fail(err) {
          reject(err);
        },
      });
    });
  },
};
