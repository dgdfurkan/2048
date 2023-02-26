using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

namespace GunduzDev
{
    public class UIManager : MonoSingleton<UIManager>
    {
        public Button rewardedAnywayButton;
        
        public void FadeSlowly(GameObject gameObject)
        {
            StartCoroutine(FadeSlowlyWithOut(gameObject));
        }

        private IEnumerator FadeSlowlyWithOut(GameObject gameObject)
        {
            yield return new WaitForSecondsRealtime(.5f);

            gameObject.SetActive(false);

            yield return new WaitForSecondsRealtime(2f);

            gameObject.SetActive(true);
        }
    }
}
