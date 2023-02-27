using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using TMPro;

namespace GunduzDev
{
    public class UIManager : MonoSingleton<UIManager>
    {
        public Button RewardedAnywayButton;
        public TextMeshProUGUI StatementText;
        
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

        public void UpdateStatementText(string message)
        {
            StatementText.text = StatementText.text + " , " + message;
        }
    }
}
