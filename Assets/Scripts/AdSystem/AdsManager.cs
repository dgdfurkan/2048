using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using System;

namespace GunduzDev
{
    public class AdsManager : MonoSingleton<AdsManager>
    {
        private bool isLoaded = false;
        public Rewarded RewardedController;
        public Interstitial InterstitialController;

        public BannerTopLeft BannerTopLeft;
        public BannerTopRight BannerTopRight;
        public BannerTopCenter BannerTopCenter;
        public BannerBottomLeft BannerBottomLeft;
        public BannerBottomRight BannerBottomRight;
        public BannerBottomCenter BannerBottomCenter;

        private void OnEnable()
        {
            DontDestroyOnLoad(this);

            MaxSdkCallbacks.OnSdkInitializedEvent += (MaxSdkBase.SdkConfiguration sdkConfiguration) => {
                // AppLovin SDK is initialized, start loading ads
                Debug.Log(" AppLovin SDK is initialized, start loading ads");
                UIManager.Instance.UpdateStatementText("SDK init");
                isLoaded = true;
            };

            MaxSdk.SetSdkKey("xr3q89IHTdm2JXfMEszAgq3OnvTxssxlBiFt9g3zUp2LDD_DE0sTglesFIb3qCQcKxpdFNrVDXQV88NyWe13tw");
            MaxSdk.SetUserId("USER_ID");
            MaxSdk.InitializeSdk();
        }

        public void ShowRewarded(Action rewardCallback = null)
        {
            if (!isLoaded) return;
            if (!RewardedController) return;
            RewardedController.rewardCallback = rewardCallback;
            RewardedController.ShowRewarded();
        }

        public void ShowInterstitial(Action rewardCallback = null)
        {
            if (!isLoaded) return;
            if (!InterstitialController) return;
            InterstitialController.rewardCallback = rewardCallback;
            InterstitialController.ShowInterstitial();
        }

        public void ShowBannerTopLeft()
        {
            if (!isLoaded) return;
            if (!BannerTopLeft) return;
            BannerTopLeft.ShowBanner();
        }
        
        public void ShowBannerTopRight()
        {
            if (!isLoaded) return;
            if (!BannerTopRight) return;
            BannerTopRight.ShowBanner();
        }
        
        public void ShowBannerTopCenter()
        {
            if (!isLoaded) return;
            if (!BannerTopCenter) return;
            BannerTopCenter.ShowBanner();
        }
        
        public void ShowBannerBottomLeft()
        {
            if (!isLoaded) return;
            if (!BannerBottomLeft) return;
            BannerBottomLeft.ShowBanner();
        }
        
        public void ShowBannerBottomRight()
        {
            if (!isLoaded) return;
            if (!BannerBottomRight) return;
            BannerBottomRight.ShowBanner();
        }
        
        public void ShowBannerBottomCenter()
        {
            if (!isLoaded) return;
            if (!BannerBottomCenter) return;
            BannerBottomCenter.ShowBanner();
        }
    }
}

