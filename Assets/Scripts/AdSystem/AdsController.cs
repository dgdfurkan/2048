using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace GunduzDev
{
    public class AdsController : MonoBehaviour
    {
        public void ShowRewarded01()
        {
            AdsManager.Instance.ShowRewarded(() => { WatchRewardedAd01(); });
        }

        private void WatchRewardedAd01()
        {
            Debug.Log("Learned");
            GameManager.Instance.IncreaseScore(5000);

            //UIManager.Instance.FadeSlowly(UIManager.Instance.rewardedAnywayButton.gameObject);
        }

        public void ShowInterstitial01()
        {
            AdsManager.Instance.ShowInterstitial(() => { WatchRewardedAd01(); });
        }
        
        public void ShowBanners()
        {
            AdsManager.Instance.ShowBannerTopLeft();
            AdsManager.Instance.ShowBannerTopRight();
            AdsManager.Instance.ShowBannerTopCenter();
            AdsManager.Instance.ShowBannerBottomLeft();
            AdsManager.Instance.ShowBannerBottomRight();
            AdsManager.Instance.ShowBannerBottomCenter();
        }
    }
}
