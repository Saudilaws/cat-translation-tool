"use strict";

self.onmessage = function (e) {
  self.postMessage({
    ok: true,
    message: "TM Worker is working",
    received: e.data
  });
};
