import adapter from 'src/AnalyticsAdapter';
import adaptermanager from 'src/adaptermanager';
import CONSTANTS from 'src/constants.json';
import { ajax } from 'src/ajax';

const url = 'https://tracker.nitropay.com/pbanalytics';
const analyticsType = 'endpoint';
let options = { siteId: 0 };

let nitropayAdapter = Object.assign(adapter({ url, analyticsType }), {
  track({ eventType, args }) {
    let auctionId = args.auctionId;

    switch (eventType) {
      case CONSTANTS.EVENTS.AUCTION_INIT:
        // console.log(`init: ${auctionId}`);
        nitropayAdapter.context.auctions[auctionId] = {
          adUnits: []
        };
        break;

      case CONSTANTS.EVENTS.BID_REQUESTED:
        // console.log(`bid requested: ${auctionId}`);
        for (let bid of args.bids) {
          if (!nitropayAdapter.context.auctions[auctionId].adUnits.includes(bid.adUnitCode)) {
            nitropayAdapter.context.auctions[auctionId].adUnits.push(bid.adUnitCode);
          }
        }
        break;

      case CONSTANTS.EVENTS.AUCTION_END:
        // console.log(`end: ${auctionId}`);
        setTimeout(() => {
          trackEmpty(auctionId);
        }, 1000);
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
  for (let adUnit of nitropayAdapter.context.auctions[auctionId].adUnits) {
    let adInfo = {
      adUnitCode: adUnit,
      bidder: 'blank',
      timeToRespond: 0,
      cpm: 0,
    };
    const wb = encodeURIComponent(btoa(JSON.stringify(adInfo)));
    ajax(`${url}?s=${options.siteId}&wb=${wb}&f=1`);
  }
}

function trackBidWon(args) {
  let auctionId = args.auctionId;

  // remove from list of pending ad units for the auction
  nitropayAdapter.context.auctions[auctionId].adUnits = nitropayAdapter.context.auctions[auctionId].adUnits.filter(a => a != args.adUnitCode);

  let adInfo = {
    adUnitCode: args.adUnitCode,
    bidder: args.bidder,
    timeToRespond: Number(args.timeToRespond),
    cpm: Number(args.cpm),
    creativeId: String(args.adId),
  };
  const wb = encodeURIComponent(btoa(JSON.stringify(adInfo)));
  ajax(`${url}?s=${options.siteId}&wb=${wb}`);
}

// save the base class function
nitropayAdapter.originEnableAnalytics = nitropayAdapter.enableAnalytics;

// override enableAnalytics so we can get access to the config passed in from the page
nitropayAdapter.enableAnalytics = function (config) {
  options = config.options;

  nitropayAdapter.context = {
    auctions: {},
  };

  nitropayAdapter.originEnableAnalytics(config); // call the base class function
};

adaptermanager.registerAnalyticsAdapter({
  adapter: nitropayAdapter,
  code: 'nitropay'
});

export default nitropayAdapter;
