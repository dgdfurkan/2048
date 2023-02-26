using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace GunduzDev
{
    public class AdsController : MonoBehaviour
    {
        public void WatchAnyway()
        {
            AdsManager.Instance.ShowRewarded(() => { WatchRewardedAd01(); });
        }

        private void WatchRewardedAd01()
        {
            Debug.Log("Learned");
            GameManager.Instance.IncreaseScore(5000);

            //UIManager.Instance.FadeSlowly(UIManager.Instance.rewardedAnywayButton.gameObject);
        }
    }
}
