using UnityEngine;

namespace GunduzDev
{
    [CreateAssetMenu(fileName = "NewTileState", menuName = "Scriptable Objects/Tile State")]
    public class TileState : ScriptableObject
    {
        public Color backgroundColor;
        public Color textColor;
    }
}
