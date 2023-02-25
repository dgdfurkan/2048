using System.Collections;
using TMPro;
using UnityEngine;

namespace GunduzDev
{
    public class GameManager : MonoBehaviour
    {
        public static GameManager Instance { get; private set; }

        public TileBoard board;
        public CanvasGroup gameOver;
        public TextMeshProUGUI scoreText;
        public TextMeshProUGUI highScoreText;

        private int score;

        private void Awake()
        {
            Instance = this;
        }

        private void Start()
        {
            NewGame();
        }

        public void NewGame()
        {
            // reset score
            SetScore(0);
            highScoreText.text = LoadHighScore().ToString();

            // hide game over screen
            gameOver.alpha = 0f;
            gameOver.interactable = false;
            gameOver.gameObject.SetActive(false);

            // update board state
            board.ClearBoard();
            board.CreateTile();
            board.CreateTile();
            board.enabled = true;
        }

        public void GameOver()
        {
            gameOver.gameObject.SetActive(true);
            board.enabled = false;
            gameOver.interactable = true;

            StartCoroutine(Fade(gameOver, 1f, 1f));
        }

        private IEnumerator Fade(CanvasGroup canvasGroup, float to, float delay = 0f)
        {
            yield return new WaitForSeconds(delay);

            float elapsed = 0f;
            float duration = 0.5f;
            float from = canvasGroup.alpha;

            while (elapsed < duration)
            {
                canvasGroup.alpha = Mathf.Lerp(from, to, elapsed / duration);
                elapsed += Time.deltaTime;
                yield return null;
            }

            canvasGroup.alpha = to;
        }

        public void IncreaseScore(int points)
        {
            SetScore(score + points);
        }

        private void SetScore(int score)
        {
            this.score = score;
            scoreText.text = score.ToString();

            SaveHighScore();
        }

        private void SaveHighScore()
        {
            int highScore = LoadHighScore();

            if (score > highScore)
            {
                PlayerPrefs.SetInt("HighScore", score);
            }
        }

        private int LoadHighScore()
        {
            return PlayerPrefs.GetInt("HighScore", 0);
        }

    }
}

