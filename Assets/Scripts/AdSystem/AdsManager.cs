using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using System;

namespace GunduzDev
{
    public class AdsManager : MonoSingleton<AdsManager>
    {
        private bool isLoaded = false;
        private void OnEnable()
        {
            DontDestroyOnLoad(this);

            MaxSdkCallbacks.OnSdkInitializedEvent += (MaxSdkBase.SdkConfiguration sdkConfiguration) => {
                // AppLovin SDK is initialized, start loading ads
                Debug.Log(" AppLovin SDK is initialized, start loading ads");
                isLoaded = true;
            };

            MaxSdk.SetSdkKey("xr3q89IHTdm2JXfMEszAgq3OnvTxssxlBiFt9g3zUp2LDD_DE0sTglesFIb3qCQcKxpdFNrVDXQV88NyWe13tw");
            MaxSdk.SetUserId("USER_ID");
            MaxSdk.InitializeSdk();
        }

        public Rewarded RewardedController;
        public void ShowRewarded(Action rewardCallback = null)
        {
            if (!isLoaded) return;
            if (!RewardedController) return;
            RewardedController.rewardCallback = rewardCallback;
            RewardedController.ShowRewarded();
        }
    }
}

