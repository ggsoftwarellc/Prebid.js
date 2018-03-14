import adapter from 'src/AnalyticsAdapter';
import adaptermanager from 'src/adaptermanager';
import CONSTANTS from 'src/constants.json';
import { ajax } from 'src/ajax';

const url = 'https://tracker.nitropay.com/pbanalytics';
const analyticsType = 'endpoint';
let options = { siteId: 0 };

let auctions = {};
let lastAuctionId;

let nitropayAdapter = Object.assign(adapter({ url, analyticsType }), {
  track({ eventType, args }) {
    let auctionId = null;
    if (args) {
      auctionId = args.auctionId ? args.auctionId : args.requestId;
    } else {
      auctionId = lastAuctionId;
    }

    switch (eventType) {
      case CONSTANTS.EVENTS.AUCTION_INIT:
        // console.log(`init: ${auctionId}`);
        lastAuctionId = auctionId;
        auctions[auctionId] = {
          adUnits: []
        };
        break;

      case CONSTANTS.EVENTS.BID_REQUESTED:
        // console.log(`bid requested: ${auctionId}`);
        for (let bid of args.bids) {
          if (!auctions[auctionId].adUnits.includes(bid.placementCode)) {
            auctions[auctionId].adUnits.push(bid.placementCode);
          }
        }
        break;

      case CONSTANTS.EVENTS.AUCTION_END:
        // console.log(`end: ${auctionId}`);
        setTimeout(trackEmpty, 1000, auctionId);
        break;

      case CONSTANTS.EVENTS.BID_WON:
        // console.log(`bid won: ${auctionId}`);
        trackBidWon(args);
        break;
    }
  }
});

function trackEmpty(auctionId) {
  // console.log(`trackEmpty: ${auctionId}`);

  for (let adUnit of auctions[auctionId].adUnits) {
    let adInfo = {
      adUnitCode: adUnit,
      bidder: 'blank',
      timeToRespond: 0,
      cpm: 0,
    };
    const wb = encodeURIComponent(btoa(JSON.stringify(adInfo)));
    ajax(`${url}?s=${options.siteId}&wb=${wb}`);
  }
}

function trackBidWon(args) {
  let auctionId = args.auctionId ? args.auctionId : args.requestId;

  // remove from list of pending ad units for the auction
  auctions[auctionId].adUnits = auctions[auctionId].adUnits.filter(a => a != args.adUnitCode);

  let adInfo = {
    adUnitCode: args.adUnitCode,
    bidder: args.bidder,
    timeToRespond: Number(args.timeToRespond),
    cpm: Number(args.cpm),
  };
  const wb = encodeURIComponent(btoa(JSON.stringify(adInfo)));
  ajax(`${url}?s=${options.siteId}&wb=${wb}`);
}

// save the base class function
nitropayAdapter.originEnableAnalytics = nitropayAdapter.enableAnalytics;

// override enableAnalytics so we can get access to the config passed in from the page
nitropayAdapter.enableAnalytics = function (config) {
  options = config.options;
  nitropayAdapter.originEnableAnalytics(config); // call the base class function
};

adaptermanager.registerAnalyticsAdapter({
  adapter: nitropayAdapter,
  code: 'nitropay'
});

export default nitropayAdapter;
