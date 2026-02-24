// アプリの状態を管理するデータ構造
let appData = JSON.parse(localStorage.getItem('karaokeApp')) || {
  activeTabId: 1,
  tabs: [
    { id: 1, name: "デフォルト", songs: [] }
  ]
};

// DOM要素の取得
const tabsContainer = document.getElementById('tabs-container');
const songList = document.getElementById('song-list');
const artistInput = document.getElementById('artist-input');
const songInput = document.getElementById('song-input');

// データの保存
function saveData() {
  localStorage.setItem('karaokeApp', JSON.stringify(appData));
  render();
}

// 現在のアクティブなタブを取得
function getActiveTab() {
  return appData.tabs.find(t => t.id === appData.activeTabId);
}

// 描画処理
function render() {
  // タブの描画
  tabsContainer.innerHTML = '';
  appData.tabs.forEach((tab, index) => {
    const tabEl = document.createElement('div');
    tabEl.className = `tab ${tab.id === appData.activeTabId ? 'active' : ''}`;

    // タブ名のテキスト（ダブルクリックで変更）
    const nameSpan = document.createElement('span');
    nameSpan.textContent = tab.name;
    nameSpan.ondblclick = (e) => {
      e.stopPropagation();
      
      const modal = document.getElementById('rename-modal');
      const input = document.getElementById('rename-input');
      
      // 現在のタブ名をはじめから入力欄に入れておく
      input.value = tab.name;
      // 独自の画面を表示する
      modal.style.display = 'flex';
      // 自動的に入力欄にフォーカスを当てる（キーボードを出しやすくする）
      input.focus();

      // 「OK」ボタンが押された時の処理
      document.getElementById('rename-ok').onclick = () => {
        const newName = input.value;
        if (newName && newName.trim() !== '') {
          tab.name = newName.trim();
          saveData();
        }
        modal.style.display = 'none'; // 画面を閉じる
      };

      // 「キャンセル」ボタンが押された時の処理
      document.getElementById('rename-cancel').onclick = () => {
        modal.style.display = 'none'; // 何もせずに画面を閉じる
      };
    };
    tabEl.appendChild(nameSpan);

    // タブ削除ボタン（×）
    const deleteBtn = document.createElement('span');
    deleteBtn.textContent = '×';
    deleteBtn.className = 'tab-delete-btn';
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      if (confirm(`タブ「${tab.name}」を削除しますか？\n※中の曲データも消えます`)) {
        appData.tabs.splice(index, 1);
        if (appData.activeTabId === tab.id && appData.tabs.length > 0) {
          appData.activeTabId = appData.tabs[0].id;
        }
        saveData();
      }
    };
    tabEl.appendChild(deleteBtn);

    // クリックでタブ切り替え
    tabEl.onclick = () => {
      appData.activeTabId = tab.id;
      render();
    };

    tabsContainer.appendChild(tabEl);
  });

  // 曲リストの描画
  songList.innerHTML = '';
  const activeTab = getActiveTab();
  if (activeTab) {
    activeTab.songs.forEach((song, index) => {
      const li = document.createElement('li');
      li.className = 'song-item';

      // 歌唱済みチェックボックス
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = song.sungToday;
      checkbox.onchange = (e) => {
        song.sungToday = e.target.checked;
        saveData();
      };

      // --- 差し替えるコード（変更後） ---
      // 曲情報
      const infoDiv = document.createElement('div');
      infoDiv.className = 'song-info';
      const titleClass = song.sungToday ? 'song-title sung' : 'song-title';
      infoDiv.innerHTML = `<span class="song-artist">${song.artist}</span><span class="${titleClass}">${song.title}</span>`;

      // お気に入り（星評価）の追加
      if (typeof song.rating === 'undefined') song.rating = 0; // 古いデータには星0をセット
      const starDiv = document.createElement('div');
      starDiv.className = 'star-rating';
      for (let i = 1; i <= 5; i++) {
        const starSpan = document.createElement('span');
        starSpan.className = i <= song.rating ? 'star active' : 'star';
        starSpan.textContent = i <= song.rating ? '★' : '☆';
        
        starSpan.onclick = () => {
          // 同じ星をタップした場合は0にリセット、それ以外はその星の数に変更
          song.rating = song.rating === i ? 0 : i;
          saveData();
        };
        starDiv.appendChild(starSpan);
      }
      infoDiv.appendChild(starDiv);

      // OK / NG 選択ボタン
      const statusContainer = document.createElement('div');
      statusContainer.className = 'status-buttons';

      const okBtn = document.createElement('button');
      okBtn.textContent = 'OK';
      okBtn.className = `status-btn ${song.status === 'OK' ? 'status-ok' : 'status-inactive'}`;
      okBtn.onclick = () => {
        song.status = song.status === 'OK' ? '未確認' : 'OK'; // もう一度押したら解除
        saveData();
      };

      const ngBtn = document.createElement('button');
      ngBtn.textContent = 'NG';
      ngBtn.className = `status-btn ${song.status === 'NG' ? 'status-ng' : 'status-inactive'}`;
      ngBtn.onclick = () => {
        song.status = song.status === 'NG' ? '未確認' : 'NG'; // もう一度押したら解除
        saveData();
      };

      statusContainer.appendChild(okBtn);
      statusContainer.appendChild(ngBtn);

      // 曲の削除（×）ボタン
      const deleteSongBtn = document.createElement('button');
      deleteSongBtn.textContent = '×';
      deleteSongBtn.className = 'song-delete-btn';
      deleteSongBtn.onclick = () => {
        if (confirm(`「${song.title}」をリストから削除しますか？`)) {
          activeTab.songs.splice(index, 1); // 配列から該当の曲を削除
          saveData();
        }
      };

      li.appendChild(checkbox);
      li.appendChild(infoDiv);
      li.appendChild(statusContainer);
      li.appendChild(deleteSongBtn); // ×ボタンを一番右に追加
      songList.appendChild(li);
    });
  }
}

// 曲の追加
document.getElementById('add-song-btn').onclick = () => {
  const artist = artistInput.value.trim();
  const title = songInput.value.trim();
  if (!artist || !title) return alert('歌手名と曲名を入力してください');

  const activeTab = getActiveTab();
  // rating: 0 （初期の星の数）を追加
  activeTab.songs.push({ artist, title, status: '未確認', sungToday: false, rating: 0 }); 
  artistInput.value = '';
  songInput.value = '';
  saveData();
};

// ソート機能 (歌手名順)
document.getElementById('sort-btn').onclick = () => {
  const activeTab = getActiveTab();
  activeTab.songs.sort((a, b) => a.artist.localeCompare(b.artist, 'ja'));
  saveData();
};

// お気に入りでソート機能 (星が多い順 → 星が同じなら歌手名順)
document.getElementById('sort-star-btn').onclick = () => {
  const activeTab = getActiveTab();
  activeTab.songs.sort((a, b) => {
    const ratingA = a.rating || 0;
    const ratingB = b.rating || 0;
    if (ratingB !== ratingA) {
      return ratingB - ratingA; // 星が多いものを上に
    }
    return a.artist.localeCompare(b.artist, 'ja'); // 星が同じ場合は歌手名順
  });
  saveData();
};

// 歌唱済みチェックのクリア
document.getElementById('clear-checks-btn').onclick = () => {
  const activeTab = getActiveTab();
  activeTab.songs.forEach(song => song.sungToday = false);
  saveData();
};

// タブの作成（独自の確認ダイアログを使用）
document.getElementById('add-tab-btn').onclick = () => {
  const tabName = prompt('新しいカラオケ会（タブ）の名前を入力してください:');
  if (!tabName) return; 

  // 独自の確認ダイアログを表示する
  const modal = document.getElementById('custom-confirm');
  modal.style.display = 'flex';

  // 「はい」ボタンが押された時の処理
  document.getElementById('modal-yes').onclick = () => {
    modal.style.display = 'none'; // 画面を閉じる
    createNewTab(tabName, true);  // コピーして作成
  };

  // 「いいえ」ボタンが押された時の処理
  document.getElementById('modal-no').onclick = () => {
    modal.style.display = 'none'; // 画面を閉じる
    createNewTab(tabName, false); // 空で作成
  };
};

// 新しいタブをデータに登録する処理（コードを分かりやすく整理）
function createNewTab(tabName, shouldCopy) {
  let newSongs = [];
  if (shouldCopy) {
    const currentTab = getActiveTab();
    if (currentTab) {
      // コピーする場合は本日のチェックを外して引き継ぐ
      newSongs = currentTab.songs.map(song => ({ ...song, sungToday: false }));
    }
  }

  const newTab = {
    id: Date.now(),
    name: tabName,
    songs: newSongs
  };
  
  appData.tabs.push(newTab);
  appData.activeTabId = newTab.id;
  saveData();
}

// 初期描画
render();

// 過去に入力した歌手名を抽出して候補リスト（datalist）を更新する関数
function updateCustomArtistList() {
  const customList = document.getElementById('custom-artist-list');
  if (!customList) return;

  const allArtists = [];
  appData.tabs.forEach(tab => {
    tab.songs.forEach(song => {
      if (song.artist) allArtists.push(song.artist);
    });
  });

  const uniqueArtists = [...new Set(allArtists)].sort((a, b) => a.localeCompare(b, 'ja'));

  customList.innerHTML = '';
  uniqueArtists.forEach(artist => {
    const li = document.createElement('li');
    li.textContent = artist;
    
    // リストの項目をタップした時の処理
    li.onclick = () => {
      artistInput.value = artist; // 入力欄に歌手名をセット
      customList.style.display = 'none'; // リストを閉じる
    };
    customList.appendChild(li);
  });
}

// データ保存時にリストも更新する
const originalSaveData = saveData;
saveData = function() {
  originalSaveData();
  updateCustomArtistList();
};

// --- 入力欄のイベント設定 ---
const customList = document.getElementById('custom-artist-list');

// 1. 歌手名の入力欄をタップ（フォーカス）したらリストを表示
artistInput.addEventListener('focus', () => {
  if (customList.children.length > 0) {
    customList.style.display = 'block';
  }
});

// 2. 文字を入力したら候補を絞り込む
artistInput.addEventListener('input', () => {
  const val = artistInput.value.toLowerCase();
  let hasVisible = false;
  Array.from(customList.children).forEach(li => {
    if (li.textContent.toLowerCase().includes(val)) {
      li.style.display = 'block';
      hasVisible = true;
    } else {
      li.style.display = 'none';
    }
  });
  customList.style.display = hasVisible ? 'block' : 'none';
});

// 3. 画面の他の場所をタップしたらリストを閉じる
document.addEventListener('click', (e) => {
  if (!artistInput.contains(e.target) && !customList.contains(e.target)) {
    customList.style.display = 'none';
  }
});

// アプリ起動時にリストを作成
updateCustomArtistList();

// SortableJSを使って、滑らかなタブの並び替え（スマホタッチ対応）を有効化
new Sortable(document.getElementById('tabs-container'), {
  animation: 150, // スライドアニメーションの速度（ミリ秒）
  ghostClass: 'dragging', // ドラッグ中の要素のデザイン（既存のCSSを使用）
  onEnd: function (evt) {
    // ドラッグが終了してドロップされた時に、保存データの順番も入れ替える
    const [movedTab] = appData.tabs.splice(evt.oldIndex, 1);
    appData.tabs.splice(evt.newIndex, 0, movedTab);
    saveData();
  }
});