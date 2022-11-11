import turbo from "../index";
import { isNumber } from "../utils/tools";
import { header } from "./config";
const baseurl = "https://turbo.api.plutus-cat.com/event_center/api/v1";
function globalChecked() {
  if (!turbo?._globalData?.access_token) {
    throw new Error("access_token is missing, you must call init first.");
  }
  if (!turbo?._globalData?.client_id) {
    throw new Error("client_id is missing, you must call init first.");
  }
}

export const register = function (e = {}) {
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
        if (res.code === 200) {
          turbo.profileSetOnce({
            $signup_time: new Date()
              .toLocaleString("cn", {
                hour12: false,
              })
              .replaceAll("/", "-"),
          });
          resolve(JSON.parse(res.data));
          return;
        }
        reject(res);
      },
      fail(err) {
        reject(err);
      },
    });
  });
};
export const handleEvent = function (e = {}) {
  globalChecked();
  if (!e?.event_type) {
    throw new Error("event_type must be required");
  }
  const data = {
    event_type: e?.event_type || "",
  };
  if (e?.properties) {
    data.properties = e?.properties;
  }
  if (e?.timestamp) {
    data.timestamp = e?.timestamp;
  }
  return new Promise(function (resolve, reject) {
    fetch.fetch({
      url: `${baseurl}/event/handle_event/?access_token=${turbo._globalData.access_token}&client_id=${turbo._globalData.client_id}`,
      method: "POST",
      header,
      data,
      success(res) {
        res.code === 200 ? resolve(JSON.parse(res.data)) : reject(res);
      },
      fail(err) {
        reject(err);
      },
    });
  });
};
export const queryUser = function () {
  globalChecked();
  const data = {
    user_list: [turbo._globalData.client_id],
  };
  return new Promise(function (resolve, reject) {
    fetch.fetch({
      url: `${baseurl}/user/get/?access_token=${turbo._globalData.access_token}`,
      method: "POST",
      header,
      data,
      success: function (res) {
        res.code === 200 ? resolve(JSON.parse(res.data)) : reject(res);
      },
      fail: function (err) {
        reject(err);
      },
    });
  });
};
