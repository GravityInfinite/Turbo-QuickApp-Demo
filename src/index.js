import { register, handleEvent, queryUser } from "./lib/customEvent";
import { autoTrackCustom } from "./lib/metaEvent";
import { header, batch_send_default } from "./lib/config";
import {
  getStorageSync,
  logger,
  extend2Lev,
  getSence,
  getSourcePackageName,
  getCurrentTitle,
  getCurrentPath,
  dateFormate,
} from "./utils/tools";
import { eventProperty } from "./lib/eventProperty";

const turbo = {};

turbo.register = register;
turbo.handleEvent = handleEvent;
turbo.queryUser = queryUser;

turbo._autoTrackCustom = autoTrackCustom;
turbo._globalData = {
  access_token: "",
  client_id: "",
};
turbo._batch_send_default = batch_send_default;
turbo._is_first_launch = false;
turbo._current_scene = null;
turbo._store = {
  storageInfo: null,
  mem: {
    mdata: [],
    getLength: function () {
      return this.mdata.length;
    },
    add: function (data) {
      this.mdata.push(data);
    },
    clear: function (len) {
      this.mdata.splice(0, len);
    },
    getMultList: function (arr) {
      const p = [];
      for (let item of arr) {
        const index = p.findIndex((i) => i[0] && i[0].type === item.type);
        if (index === -1) {
          p.push([item]);
        } else {
          p[index].push(item);
        }
      }
      const end = [];
      const commonProps = eventProperty.getProperties();
      for (let item of p) {
        const type = item.length ? item[0]?.type : "track";
        end.push({
          client_id: turbo._globalData.client_id,
          type,
          event_list: item.map((subitem) => {
            const properties = {};
            // 加入预定义属性
            Object.keys(subitem.properties).forEach((key) => {
              properties[key] = subitem.properties[key];
            });
            // 加入带$的公共属性
            if (type !== "profile") {
              Object.keys(commonProps).forEach((key) => {
                properties[key] = commonProps[key];
              });
            }

            return {
              event: subitem.event,
              time: subitem.time,
              properties,
            };
          }),
        });
      }
      return end;
    },
  },
  getStorage: async function () {
    if (this.storageInfo) {
      return this.storageInfo;
    } else {
      this.storageInfo = await getStorageSync(turbo._para.storage_store_key);
      return this.storageInfo.data;
    }
  },
  init: async function () {
    const info = await storage.get({
      key: turbo._para.storage_store_key,
    });
    if (!info.data) {
      turbo._is_first_launch = true;
      storage.set({
        key: turbo._para.storage_store_key,
        value: true,
      });
      const commonProps = eventProperty.getProperties();
      turbo.profileSetOnce({
        $first_visit_time: dateFormate(new Date(), true),
        $os: commonProps.$os,
        $brand: commonProps.$manufacturer,
        $model: commonProps.$model,
      });
    }
  },
};
turbo._para = {
  name: "Gravity Engine",
  server_url:
    "https://turbo.api.plutus-cat.com/event_center/api/v1/eventv2/collect/",
  // autoTrack: {
  //   appLaunch: true, // 默认为 true，false 则关闭 $MPLaunch 事件采集
  //   pageShow: true, // $MPViewScreen
  // },
  // 是否允许控制台打印查看埋点数据(建议开启查看)
  show_log: false,
  storage_store_key: "turbo2022_quiakapp",
};

turbo.setPara = function (para) {
  turbo._para = extend2Lev(turbo._para, para);
  // 防改参数
  turbo._para.server_url =
    "https://turbo.api.plutus-cat.com/event_center/api/v1/eventv2/collect/";
};

turbo.init = async function (access_token = "", client_id = "", App) {
  if (!access_token) {
    throw new Error("access_token must be required.");
  }

  if (!client_id) {
    throw new Error("client_id must be required.");
  }
  if (!App) {
    throw new Error("this must be required.");
  }
  App.turbo = turbo;
  const first_visit_day = await storage.get({
    key: "first_visit_day",
  });
  if (!first_visit_day.data) {
    await storage.set({
      key: "first_visit_day",
      value: new Date().toLocaleDateString(),
    });
  }

  await eventProperty.infoInit();
  turbo._globalData.access_token = access_token;
  turbo._globalData.client_id = client_id;
  await turbo._store.init();
  sendStrategy.init();
  const res = await eventProperty.getNetwork()
  sendOnce({
    type: "track",
    event: "$AppStart",
    properties: {
      $is_first_time: turbo._is_first_launch,
      $scene: getSence(),
      $network_type: res.type,
      $source_package_name: getSourcePackageName(),
    },
    time: Date.now(),
  });
};

function sendOnce(data) {
  if (!turbo._globalData.client_id) {
    return;
  }
  const datas = turbo._store.mem.getMultList([data]) || [];
  fetch.fetch({
    url:
      turbo._para.server_url +
      `?access_token=${turbo._globalData.access_token}`,
    method: "POST",
    header,
    data: datas[0],
  });
}

const sendStrategy = {
  dataHasSend: true,
  dataHasChange: false,
  syncStorage: false,
  failTime: 0,
  is_first_batch_write: true,
  init: function () {
    sendStrategy.batchInterval(); //定时器
  },
  send: function (data, callback) {
    if (turbo._store.mem.getLength() >= 500) {
      logger.info("数据量存储过大，有异常");
      turbo._store.mem.mdata.shift();
    }
    if (data) {
      turbo._store.mem.add(data);
      callback && callback();
    }
    if (turbo._store.mem.getLength() >= turbo._batch_send_default.max_length) {
      this.batchSend();
    }
  },
  requestAll: function (parmas) {
    return new Promise((resolve, reject) => {
      fetch.fetch({
        url:
          turbo._para.server_url +
          `?access_token=${turbo._globalData.access_token}`,
        method: "POST",
        header,
        data: parmas,
        success: function (res) {
          resolve({
            ...res,
            count: parmas.event_list.length,
          });
        },
        fail: function (err) {
          reject(err);
        },
      });
    });
  },
  fetchRequest: function (option) {
    const data = turbo._store.mem.getMultList(option.data) || [];

    if (!option?.data?.length) {
      option.success(option.len);
      return;
    }

    const stack = [];
    for (let params of data) {
      stack.push(this.requestAll(params));
    }
    Promise.all(stack)
      .then((res) => {
        for (let i = 0; i < res.length; i++) {
          if (res[i].data.code === 2000) {
            option.success(0);
          } else {
            option.success(res[i].count);
          }
        }
      })
      .catch(() => {
        option.fail();
      });
  },
  batchSend: function () {
    if (!turbo._globalData.client_id) {
      sendFail();
      return;
    }
    const data = turbo._store.mem.mdata;
    if (!data.length) {
      return;
    }
    this.fetchRequest({
      data: data,
      len: data.length,
      success: this.batchRemove.bind(this),
      fail: this.sendFail.bind(this),
    });
  },
  sendFail: function () {
    this.dataHasSend = true;
    this.failTime++;
  },
  batchRemove: function (len) {
    turbo._store.mem.clear(len);
    this.dataHasSend = true;
    this.dataHasChange = true;
    this.batchWrite();
    this.failTime = 0;
  },
  batchWrite: function () {
    const me = this;
    if (this.dataHasChange) {
      if (this.is_first_batch_write) {
        this.is_first_batch_write = false;
        setTimeout(function () {
          me.batchSend();
        }, 1000);
      }
      this.dataHasChange = false;
    }
  },
  // ↓ 初始化的时候调用，interval batch
  batchInterval: function () {
    const _this = this;
    function loopWrite() {
      setTimeout(function () {
        _this.batchWrite();
        loopWrite();
      }, 500);
    }

    function loopSend() {
      setTimeout(function () {
        _this.batchSend();
        loopSend();
      }, turbo._batch_send_default.send_timeout * Math.pow(2, _this.failTime));
    }
    loopWrite();
    loopSend();
  },
};

const turboEvent = {
  send: function (data, callback) {
    // 1154：朋友圈内打开“单页模式”
    if (
      turbo._current_scene &&
      turbo._current_scene === 1154 &&
      !turbo._para.preset_events.moments_page
    ) {
      return false;
    }
    if (data) {
      logger.info(data);
      sendStrategy.send(data, callback);
    } else {
      logger.info("error: 数据异常 ", data);
    }
  },
};

turbo.track = function (event, properties, callback) {
  turboEvent.send(
    {
      type: "track",
      event,
      properties,
      time: Date.now(),
    },
    callback
  );
};

turbo.profileSet = function (properties, callback) {
  turboEvent.send(
    {
      type: "profile",
      event: "profile_set",
      properties,
      time: Date.now(),
    },
    callback
  );
};
turbo.profileSetOnce = function (properties, callback) {
  turboEvent.send(
    {
      type: "profile",
      event: "profile_set_once",
      properties,
      time: Date.now(),
    },
    callback
  );
};
turbo.profileIncrement = function (properties, callback) {
  turboEvent.send(
    {
      type: "profile",
      event: "profile_increment",
      properties,
      time: Date.now(),
    },
    callback
  );
};
turbo.profileDelete = function (callback) {
  turboEvent.send(
    {
      type: "profile",
      event: "profile_delete",
      properties: {},
      time: Date.now(),
    },
    callback
  );
};
turbo.profileAppend = function (properties, callback) {
  turboEvent.send(
    {
      type: "profile",
      event: "profile_append",
      properties,
      time: Date.now(),
    },
    callback
  );
};
turbo.profileUnset = function (key, callback) {
  turboEvent.send(
    {
      type: "profile",
      event: "profile_unset",
      properties: {
        [key]: null,
      },
      time: Date.now(),
    },
    callback
  );
};
turbo.pageShow = function () {
  turbo.track("$AppViewScreen", {
    $scene: getSence(),
    $title: getCurrentTitle(),
    $url_path: getCurrentPath(),
    $source_package_name: getSourcePackageName(),
  });
};
turbo.registerApp = function (obj = {}) {
  if (!isObject(obj)) {
    logger.info("error: registerApp 参数必须是对象");
    return;
  }
  eventProperty.getRegisterProperties(obj);
};

// turbo.registerEvent = function () {
//   turbo.track("$MPRegister", {});
// };

// turbo.loginEvent = function () {
//   turbo.track("$MPLogin", {});
// };
// turbo.logoutEvent = function () {
//   turbo.track("$MPLogout", {});
// };

export default turbo;
