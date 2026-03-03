// 鍵盤画像に準拠した音域リストと色の定義
const pitchOptions = [
  { label: "未設定", value: "", colorClass: "" },
  // Gray (low)
  ...["lowE", "lowF", "lowF#", "lowG", "lowG#"].map(v => ({ label: v, value: v, colorClass: "pitch-gray" })),
  // Green (mid1 A~E)
  ...["mid1A", "mid1A#", "mid1B", "mid1C", "mid1C#", "mid1D", "mid1D#", "mid1E"].map(v => ({ label: v, value: v, colorClass: "pitch-green" })),
  // Light Green (mid1 F~G, mid2 A~E)
  ...["mid1F", "mid1F#", "mid1G", "mid1G#", "mid2A", "mid2A#", "mid2B", "mid2C", "mid2C#", "mid2D", "mid2D#", "mid2E"].map(v => ({ label: v, value: v, colorClass: "pitch-lgreen" })),
  // Yellow (mid2 F~G#)
  ...["mid2F", "mid2F#", "mid2G", "mid2G#"].map(v => ({ label: v, value: v, colorClass: "pitch-yellow" })),
  // Orange (hi A~B)
  ...["hiA", "hiA#", "hiB"].map(v => ({ label: v, value: v, colorClass: "pitch-orange" })),
  // Red (hi C~E)
  ...["hiC", "hiC#", "hiD", "hiD#", "hiE"].map(v => ({ label: v, value: v, colorClass: "pitch-red" })),
  // Purple (hi F~, hihi)
  ...["hiF", "hiF#", "hiG", "hiG#", "hihiA", "hihiA#", "hihiB"].map(v => ({ label: v, value: v, colorClass: "pitch-purple" }))
];

// ピアノ鍵盤のレイアウト構造（w=白鍵, b=黒鍵）
const keyboardLayout = [
  { w: "lowE" }, { w: "lowF", b: "lowF#" }, { w: "lowG", b: "lowG#" },
  { w: "mid1A", b: "mid1A#" }, { w: "mid1B" }, { w: "mid1C", b: "mid1C#" }, { w: "mid1D", b: "mid1D#" }, { w: "mid1E" },
  { w: "mid1F", b: "mid1F#" }, { w: "mid1G", b: "mid1G#" }, { w: "mid2A", b: "mid2A#" }, { w: "mid2B" }, { w: "mid2C", b: "mid2C#" }, { w: "mid2D", b: "mid2D#" }, { w: "mid2E" },
  { w: "mid2F", b: "mid2F#" }, { w: "mid2G", b: "mid2G#" },
  { w: "hiA", b: "hiA#" }, { w: "hiB" },
  { w: "hiC", b: "hiC#" }, { w: "hiD", b: "hiD#" }, { w: "hiE" },
  { w: "hiF", b: "hiF#" }, { w: "hiG", b: "hiG#" }, { w: "hihiA", b: "hihiA#" }, { w: "hihiB" }
];

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
    nameSpan.ondblclick = async (e) => {
      e.stopPropagation();
      const newName = await customPrompt('新しいタブ名を入力してください:', tab.name);
      if (newName && newName.trim() !== '') {
        tab.name = newName.trim();
        saveData();
        render();
      }
    };
    tabEl.appendChild(nameSpan);

    // タブ削除ボタン（×）
    const deleteBtn = document.createElement('span');
    deleteBtn.textContent = '×';
    deleteBtn.className = 'tab-delete-btn';
    deleteBtn.onclick = async (e) => {
      e.stopPropagation();
      if (await customConfirm(`タブ「${tab.name}」を削除しますか？\n※中の曲データも消えます`)) {
        appData.tabs.splice(index, 1);
        if (appData.activeTabId === tab.id && appData.tabs.length > 0) {
          appData.activeTabId = appData.tabs[0].id;
        }
        saveData();
        render();
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
    // 入力欄の文字（検索ワード）を取得（小文字にして比較しやすくする）
    const filterText = artistInput.value.trim().toLowerCase();

    activeTab.songs.forEach((song, index) => {
      // 検索ワードが入力されており、かつ歌手名に含まれていなければスキップ（描画しない）
      if (filterText && !song.artist.toLowerCase().includes(filterText)) {
        return;
      }

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

          // 設定がオンなら、他タブの同じ曲の星も同期する
          const syncCb = document.getElementById('toggle-sync-rating');
          const isSyncOn = syncCb ? syncCb.checked : (localStorage.getItem('syncRating') !== 'false');
          
          if (isSyncOn) {
            appData.tabs.forEach(tab => {
              tab.songs.forEach(s => {
                if (s.artist === song.artist && s.title === song.title) {
                  s.rating = song.rating;
                }
              });
            });
          }

          saveData();
          render();
        };
        starDiv.appendChild(starSpan);
      }
      infoDiv.appendChild(starDiv);

      // OK / NG / 音域NG 選択ボタン
      const statusContainer = document.createElement('div');
      statusContainer.className = 'status-buttons';

      // ステータス同期のための共通処理
      const applyStatusSync = (targetSong) => {
        const syncCb = document.getElementById('toggle-sync-status');
        // チェックボックスが取得できない場合でも、保存された設定を使って確実に同期する
        const isSyncOn = syncCb ? syncCb.checked : (localStorage.getItem('syncStatus') !== 'false');
        
        if (isSyncOn) {
          appData.tabs.forEach(tab => {
            tab.songs.forEach(s => {
              // 歌手名と曲名が完全一致するものを探して書き換える
              if (s.artist === targetSong.artist && s.title === targetSong.title) {
                s.status = targetSong.status;
              }
            });
          });
        }
        saveData();
        render(); // 見た目をすぐに最新状態にする
      };

      const okBtn = document.createElement('button');
      okBtn.textContent = 'OK';
      okBtn.className = `status-btn ${song.status === 'OK' ? 'status-ok' : 'status-inactive'}`;
      okBtn.onclick = () => {
        song.status = song.status === 'OK' ? '未確認' : 'OK';
        applyStatusSync(song); // ← 同期処理を呼び出すように修正！
      };

      const ngBtn = document.createElement('button');
      ngBtn.textContent = 'NG';
      ngBtn.className = `status-btn ${song.status === 'NG' ? 'status-ng' : 'status-inactive'}`;
      ngBtn.onclick = () => {
        song.status = song.status === 'NG' ? '未確認' : 'NG';
        applyStatusSync(song); // ← 同期処理を呼び出すように修正！
      };

      // 「音域NG」ボタン
      const rangeNgBtn = document.createElement('button');
      rangeNgBtn.textContent = '音域NG';
      rangeNgBtn.className = `status-btn ${song.status === '音域NG' ? 'status-range-ng' : 'status-inactive'}`;
      rangeNgBtn.onclick = () => {
        song.status = song.status === '音域NG' ? '未確認' : '音域NG'; 
        applyStatusSync(song); // ← 同期処理を呼び出すように修正！
      };

      statusContainer.appendChild(okBtn);
      statusContainer.appendChild(ngBtn);
      statusContainer.appendChild(rangeNgBtn); // 「音域NG」を一番右に追加

      // 曲の削除（×）ボタン
      const deleteSongBtn = document.createElement('button');
      deleteSongBtn.textContent = '×';
      deleteSongBtn.className = 'song-delete-btn';
      deleteSongBtn.onclick = async () => {
        if (await customConfirm(`「${song.title}」をリストから削除しますか？`)) {
          const originalIndex = activeTab.songs.indexOf(song);
          if (originalIndex !== -1) {
            activeTab.songs.splice(originalIndex, 1);
            saveData();
            render();
          }
        }
      };

      // 1段目の要素をまとめる専用の枠を作る
      const mainRow = document.createElement('div');
      mainRow.className = 'song-main-row';
      
      mainRow.appendChild(checkbox);
      mainRow.appendChild(infoDiv);
      mainRow.appendChild(statusContainer);
      mainRow.appendChild(deleteSongBtn); 
      
      li.appendChild(mainRow); // まとめた1段目をリストに追加

      // ▼▼▼ 音域ブロック（設定がONの時だけ表示） ▼▼▼
      if (appData.settings && appData.settings.showVocalRange) {
        const vocalContainer = document.createElement('div');
        vocalContainer.className = 'vocal-range-container-new'; // 新デザイン用のクラス

        // ① 上段：テキスト表示と検索ボタン
        const headerRow = document.createElement('div');
        headerRow.className = 'vocal-header';

        const textInfo = document.createElement('div');
        textInfo.className = 'vocal-text';
        
        // 音域に合わせて色（クラス）を計算して付与する
        const lowPitchObj = pitchOptions.find(p => p.value === song.lowPitch);
        const lowPitchClass = lowPitchObj ? lowPitchObj.colorClass : 'pitch-gray'; // 未設定は灰色
        
        const highPitchObj = pitchOptions.find(p => p.value === song.highPitch);
        const highPitchClass = highPitchObj ? highPitchObj.colorClass : 'pitch-gray'; // 未設定は灰色
        
        textInfo.innerHTML = `地低: <span class="vocal-val vocal-pitch-badge ${lowPitchClass}">${song.lowPitch || '未設定'}</span> 〜 地高: <span class="vocal-val vocal-pitch-badge ${highPitchClass}">${song.highPitch || '未設定'}</span>`;
        
        const searchBtn = document.createElement('button');
        searchBtn.textContent = '🔍 音域検索';
        searchBtn.className = 'vocal-search-btn';
        searchBtn.onclick = () => {
          const query = encodeURIComponent(`${song.artist} ${song.title} 音域`);
          window.open(`https://www.google.com/search?q=${query}`, '_blank');
        };

        headerRow.appendChild(textInfo);
        headerRow.appendChild(searchBtn);
        vocalContainer.appendChild(headerRow);

        // ② 下段：ピアノ鍵盤UI
        const kbdWrapper = document.createElement('div');
        kbdWrapper.className = 'keyboard-wrapper';

        const kbd = document.createElement('div');
        kbd.className = 'piano-keyboard';

        const lowIdx = pitchOptions.findIndex(p => p.value === song.lowPitch);
        const highIdx = pitchOptions.findIndex(p => p.value === song.highPitch);

        // 鍵盤をタップした時の賢い判定ロジック
        const handleKeyClick = (val) => {
          const clickedIdx = pitchOptions.findIndex(p => p.value === val);
          if (clickedIdx <= 0) return;

          // 1. まず現在の曲の音域を更新する
          if (song.lowPitch === val && song.highPitch === val) {
            song.lowPitch = ''; song.highPitch = '';
          } else if (song.lowPitch === val) {
            song.lowPitch = song.highPitch;
          } else if (song.highPitch === val) {
            song.highPitch = song.lowPitch;
          } else if (lowIdx <= 0 && highIdx <= 0) {
            song.lowPitch = val; song.highPitch = val;
          } else if (lowIdx > 0 && highIdx <= 0) {
            if (clickedIdx < lowIdx) { song.lowPitch = val; song.highPitch = pitchOptions[lowIdx].value; }
            else { song.highPitch = val; }
          } else {
            if (clickedIdx < lowIdx) song.lowPitch = val;
            else if (clickedIdx > highIdx) song.highPitch = val;
            else {
              if ((clickedIdx - lowIdx) < (highIdx - clickedIdx)) song.lowPitch = val;
              else song.highPitch = val;
            }
          }

          // 2. 他のタブにある「同じ歌手名・アニメ」かつ「同じ曲名」の曲すべてに、新しい音域をコピーして同期する
          appData.tabs.forEach(tab => {
            tab.songs.forEach(s => {
              if (s.artist === song.artist && s.title === song.title) {
                s.lowPitch = song.lowPitch;
                s.highPitch = song.highPitch;
              }
            });
          });

          // 鍵盤をタップした直後はジャンプしないよう、現在のスクロール位置を一時保存する
          song._tempScroll = kbdWrapper.scrollLeft;

          // 3. すべて同期してから保存して画面を更新
          saveData();
        };

        // 鍵盤を描画して色を塗る
        keyboardLayout.forEach(group => {
          const wKey = document.createElement('div');
          wKey.className = 'key-white';
          wKey.dataset.pitch = group.w; // スクロール計算用の目印
          const wIdx = pitchOptions.findIndex(p => p.value === group.w);
          
          // 白鍵に音名（lowEなど）を縦書きで表示する
          const wLabel = document.createElement('span');
          wLabel.className = 'key-label';
          // 1文字ずつ改行タグ(<br>)で繋いで縦書きにする（スマホで絶対に崩れない確実な方法）
          wLabel.innerHTML = group.w.split('').join('<br>');
          wKey.appendChild(wLabel);

          // 選択範囲に含まれていれば色を塗る
          if (wIdx > 0 && ((lowIdx > 0 && highIdx > 0 && wIdx >= lowIdx && wIdx <= highIdx) || (wIdx === lowIdx || wIdx === highIdx))) {
            if (pitchOptions[wIdx].colorClass) wKey.classList.add(pitchOptions[wIdx].colorClass);
          }
          wKey.onclick = () => handleKeyClick(group.w);

          // 先に白鍵だけを画面に配置する
          kbd.appendChild(wKey);

          // 黒鍵（#）がある場合
          if (group.b) {
            // 黒鍵を入れるための「幅0の透明な隙間」を作る
            const bWrapper = document.createElement('div');
            bWrapper.className = 'black-key-wrapper';

            const bKey = document.createElement('div');
            bKey.className = 'key-black';
            bKey.dataset.pitch = group.b; // スクロール計算用の目印
            const bIdx = pitchOptions.findIndex(p => p.value === group.b);
            
            // 選択範囲に含まれていれば色を塗る
            if (bIdx > 0 && ((lowIdx > 0 && highIdx > 0 && bIdx >= lowIdx && bIdx <= highIdx) || (bIdx === lowIdx || bIdx === highIdx))) {
              if (pitchOptions[bIdx].colorClass) bKey.classList.add(pitchOptions[bIdx].colorClass);
            }
            bKey.onclick = (e) => {
              e.stopPropagation(); 
              handleKeyClick(group.b);
            };
            
            // 黒鍵を隙間の中に入れ、その隙間を白鍵のすぐ右隣に配置する
            bWrapper.appendChild(bKey);
            kbd.appendChild(bWrapper); 
          }
        });

        kbdWrapper.appendChild(kbd);
        vocalContainer.appendChild(kbdWrapper);
        li.appendChild(vocalContainer); 

        // 描画された直後にスクロール位置を自動調整する
        setTimeout(() => { // 早すぎて位置が取れないバグを防ぐため、ごくわずかに待つ(setTimeout)
          if (song._tempScroll !== undefined) {
            // ① 鍵盤操作の直後は元の位置をキープ
            kbdWrapper.scrollLeft = song._tempScroll;
            delete song._tempScroll; 
          } else if (song.lowPitch) {
            // ② 地低（lowPitch）の「1つ前の白鍵」を正確に探して表示する
            // まず、lowPitch が属しているグループの場所（インデックス番号）を探す
            const layoutIdx = keyboardLayout.findIndex(g => g.w === song.lowPitch || g.b === song.lowPitch);
            
            if (layoutIdx !== -1) {
              // 1つ前の白鍵の場所（一番左端のキーの場合は0のままにする）
              const prevIdx = Math.max(0, layoutIdx - 1);
              const prevPitch = keyboardLayout[prevIdx].w; // 1つ前の白鍵の音名
              
              const targetKey = kbd.querySelector(`[data-pitch="${prevPitch}"]`);
              if (targetKey) {
                // ブラウザの描画が完了した状態での「確実な相対位置」を計算してピタッとスクロールする
                const kbdRect = kbd.getBoundingClientRect();
                const keyRect = targetKey.getBoundingClientRect();
                kbdWrapper.scrollLeft = keyRect.left - kbdRect.left;
              }
            }
          }
        }, 10);
      }
      // ▲▲▲ 音域ブロックここまで ▲▲▲

      songList.appendChild(li);
    });
  }
}

// 曲の追加
//document.getElementById('add-song-btn').onclick = async () => {
  //const artist = artistInput.value.trim();
  //const title = songInput.value.trim();
  //if (!artist || !title) {
    //await customAlert('歌手名と曲名を入力してください');
    //return;
  //}
document.getElementById('add-song-btn').onclick = async () => {
  // 歌手名が空欄の場合は、見た目が崩れないように「-」という文字を入れる
  const artist = artistInput.value.trim() || '-'; 
  const title = songInput.value.trim();
  
  // ▼ 変更：「曲名」さえ入力されていればOKにする
  if (!title) {
    await customAlert('歌手名と曲名を入力してください');
    return;
  }

  // 全タブを探して、既に同じ曲があれば音域と【評価（星）】データを引っ張ってくる
  let existingLowPitch = '';
  let existingHighPitch = '';
  let existingRating = 0;
  let existingStatus = '未確認';
  appData.tabs.forEach(tab => {
    tab.songs.forEach(s => {
      if (s.artist === artist && s.title === title) {
        if (s.lowPitch) existingLowPitch = s.lowPitch;
        if (s.highPitch) existingHighPitch = s.highPitch;
        if (s.rating) existingRating = s.rating; // 星の数も取得
        if (s.status && s.status !== '未確認') existingStatus = s.status; //OK/NGなどを取得
      }
    });
  });

  // 設定で「星の同期オフ」になっていれば、星の引き継ぎはしない（0に戻す）
  if (!document.getElementById('toggle-sync-rating').checked) {
    existingRating = 0;
  }

  const activeTab = getActiveTab();
  // 見つかった既存の音域と評価データを初期値としてセットして追加する
  activeTab.songs.unshift({ 
    artist, 
    title, 
    status: existingStatus, //取得したステータスをセットする
    sungToday: false, 
    rating: existingRating, //取得した星の数をセットする
    lowPitch: existingLowPitch,
    highPitch: existingHighPitch
  });
  
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

// お気に入りでソート機能
document.getElementById('sort-star-btn').onclick = () => {
  const activeTab = getActiveTab();
  activeTab.songs.sort((a, b) => {
    const ratingA = a.rating || 0;
    const ratingB = b.rating || 0;
    // 星の数だけで比較。同じ星の数なら「直前の並び順」をそのままキープする
    return ratingB - ratingA; 
  });
  saveData();
};

// チェック状況でソート機能
document.getElementById('sort-check-btn').onclick = () => {
  const activeTab = getActiveTab();
  activeTab.songs.sort((a, b) => {
    if (a.sungToday !== b.sungToday) {
      // 未チェックを上、チェック済みを下にする
      return a.sungToday ? 1 : -1; 
    }
    // チェック状態が同じなら「直前の並び順」をそのままキープする
    return 0; 
  });
  saveData();
};

// すべての曲にチェックを入れる（オールチェック）
document.getElementById('all-check-btn').onclick = () => {
  const activeTab = getActiveTab();
  activeTab.songs.forEach(song => song.sungToday = true);
  saveData();
};

// 歌唱済みチェックのクリア
document.getElementById('clear-checks-btn').onclick = () => {
  const activeTab = getActiveTab();
  activeTab.songs.forEach(song => song.sungToday = false);
  saveData();
};

// 新規タブの追加（常に空のタブを作成）
document.getElementById('add-tab-btn').onclick = async () => {
  const tabName = await customPrompt('新しいタブの名前を入力してください');
  if (!tabName) return; 

  const newTabId = Date.now();
  appData.tabs.push({ id: newTabId, name: tabName, songs: [] });
  appData.activeTabId = newTabId; 
  saveData();
  render(); 
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
      render(); // 選んだ歌手名で即座に下のリストを絞り込む
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

  // 入力するたびに下の曲リストもリアルタイムに絞り込む
  render();
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

// --- 音域設定機能 ---
if (!appData.settings) appData.settings = { showVocalRange: false }; // 初期設定

const settingsModal = document.getElementById('settings-modal');
document.getElementById('settings-btn').onclick = () => {
  document.getElementById('toggle-vocal-range').checked = appData.settings.showVocalRange;
  settingsModal.style.display = 'flex';
};
document.getElementById('settings-close').onclick = () => {
  settingsModal.style.display = 'none';
};
document.getElementById('toggle-vocal-range').onchange = (e) => {
  appData.settings.showVocalRange = e.target.checked;
  saveData(); // 設定を変えたら保存して画面を再描画
};

// 画面のどこかをタップした時に、開いている独自の音域ドロップダウンをすべて閉じる
document.addEventListener('click', () => {
  document.querySelectorAll('.custom-select-dropdown').forEach(d => {
    d.style.display = 'none';
  });
});

// ☆彡
const APP_PASSWORD = "Ok9945"; 

const passwordScreen = document.getElementById('password-screen');
const passwordInput = document.getElementById('app-password-input');
const passwordSubmitBtn = document.getElementById('password-submit-btn');
const passwordError = document.getElementById('password-error');

// すでにパスワード入力済み（認証成功）のブラウザかどうかをチェック
if (localStorage.getItem('karaokeAppUnlocked') === 'true') {
  passwordScreen.style.display = 'none'; // 認証済みならパスワード画面を消して即座にアプリを表示
}

// ログインボタンを押した時の処理
const attemptLogin = () => {
  if (passwordInput.value === APP_PASSWORD) {
    // パスワード正解：認証状態をブラウザに記憶させ、画面を消す
    localStorage.setItem('karaokeAppUnlocked', 'true');
    passwordScreen.style.display = 'none';
  } else {
    // パスワード不正解：エラーメッセージを表示
    passwordError.style.display = 'block';
  }
};

passwordSubmitBtn.onclick = attemptLogin;

// スマホのキーボードの「完了(Enter)」を押した時にもログインできるようにする
passwordInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') attemptLogin();
});

// --- 一括コピー・一括削除機能 ---
// 1. 「＋」ボタン（他タブへ一括送信）の処理
document.getElementById('bulk-copy-btn').onclick = async () => {
  const activeTab = getActiveTab();
  const selectedSongs = activeTab.songs.filter(s => s.sungToday);
  
  if (selectedSongs.length === 0) {
    await customAlert('チェックされた曲がありません。');
    return;
  }

  const listEl = document.getElementById('copy-tab-list');
  listEl.innerHTML = ''; 
  
  let hasOtherTabs = false;
  appData.tabs.forEach(tab => {
    if (tab.id !== activeTab.id) {
      const label = document.createElement('label');
      label.style.display = 'flex';
      label.style.alignItems = 'center';
      label.style.gap = '10px';
      label.style.cursor = 'pointer';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = tab.id;
      cb.className = 'copy-target-cb'; 
      cb.style.width = '20px';
      cb.style.height = '20px';

      const span = document.createElement('span');
      span.textContent = tab.name;

      label.appendChild(cb);
      label.appendChild(span);
      listEl.appendChild(label);
      hasOtherTabs = true;
    }
  });

  if (!hasOtherTabs) {
    await customAlert('送信先の他のタブがありません。先に「＋ 新規タブ」を作成してください。');
    return;
  }

  const modal = document.getElementById('copy-modal');
  modal.style.display = 'flex';

  document.getElementById('copy-modal-ok').onclick = async () => {
    const checkedBoxes = Array.from(document.querySelectorAll('.copy-target-cb:checked'));
    if (checkedBoxes.length === 0) {
      await customAlert('送信先のタブを1つ以上選択してください。');
      return;
    }

    let totalAddedCount = 0;
    let targetTabNames = [];

    checkedBoxes.forEach(cb => {
      const targetTabId = parseInt(cb.value, 10);
      const targetTab = appData.tabs.find(t => t.id === targetTabId);

      if (targetTab) {
        targetTabNames.push(targetTab.name);
        selectedSongs.forEach(song => {
          const exists = targetTab.songs.some(s => s.artist === song.artist && s.title === song.title);
          if (!exists) {
            const newSong = JSON.parse(JSON.stringify(song)); 
            newSong.sungToday = false; 
            targetTab.songs.push(newSong);
            totalAddedCount++;
          }
        });
      }
    });
    
    activeTab.songs.forEach(s => s.sungToday = false);
    saveData();
    render();
    
    modal.style.display = 'none';
    await customAlert(`選択したタブ（${targetTabNames.join(', ')}）に計 ${totalAddedCount}曲 送信しました！\n（※既にあった曲はスキップされました）`);
  };

  document.getElementById('copy-modal-cancel').onclick = () => {
    modal.style.display = 'none';
  };
};

// 2. 「🗑️」ボタン（一括削除）の処理
document.getElementById('bulk-delete-btn').onclick = async () => {
  const activeTab = getActiveTab();
  const selectedSongs = activeTab.songs.filter(s => s.sungToday);
  
  if (selectedSongs.length === 0) {
    await customAlert('チェックされた曲がありません。');
    return;
  }

  if (await customConfirm(`チェックされている ${selectedSongs.length} 曲を一括削除しますか？\n（この操作は元に戻せません）`)) {
    activeTab.songs = activeTab.songs.filter(s => !s.sungToday);
    saveData();
    render();
  }
};

// --- お気に入り度同期設定の初期化と保存 ---
const syncRatingCb = document.getElementById('toggle-sync-rating');
// 初期値は「オン（true）」に設定。ユーザーがオフにした記録がなければオンになる。
syncRatingCb.checked = localStorage.getItem('syncRating') !== 'false';

// チェックを付け外した時に状態を保存する
syncRatingCb.onchange = () => {
  localStorage.setItem('syncRating', syncRatingCb.checked);
};

// --- ステータス同期設定の初期化と保存 ---
const syncStatusCb = document.getElementById('toggle-sync-status');
// 初期値は「オン（true）」。ユーザーがオフにした記録がなければオンになる。
syncStatusCb.checked = localStorage.getItem('syncStatus') !== 'false';

syncStatusCb.onchange = () => {
  localStorage.setItem('syncStatus', syncStatusCb.checked);
};

// --- 万能ポップアップシステム ---
const showCustomModal = (type, message, defaultValue = '') => {
  return new Promise((resolve) => {
    const modal = document.getElementById('custom-modal');
    const msgEl = document.getElementById('custom-modal-message');
    const inputEl = document.getElementById('custom-modal-input');
    const okBtn = document.getElementById('custom-modal-ok');
    const cancelBtn = document.getElementById('custom-modal-cancel');

    msgEl.textContent = message;
    
    // イベントが重複しないようにボタンをリセット
    const newOkBtn = okBtn.cloneNode(true);
    const newCancelBtn = cancelBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOkBtn, okBtn);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

    if (type === 'alert') {
      inputEl.style.display = 'none';
      newCancelBtn.style.display = 'none';
      newOkBtn.onclick = () => { modal.style.display = 'none'; resolve(true); };
    } else if (type === 'confirm') {
      inputEl.style.display = 'none';
      newCancelBtn.style.display = 'block';
      newOkBtn.onclick = () => { modal.style.display = 'none'; resolve(true); };
      newCancelBtn.onclick = () => { modal.style.display = 'none'; resolve(false); };
    } else if (type === 'prompt') {
      inputEl.style.display = 'block';
      inputEl.value = defaultValue;
      newCancelBtn.style.display = 'block';
      newOkBtn.onclick = () => { modal.style.display = 'none'; resolve(inputEl.value); };
      newCancelBtn.onclick = () => { modal.style.display = 'none'; resolve(null); };
      inputEl.onkeypress = (e) => { if (e.key === 'Enter') newOkBtn.click(); };
    }

    modal.style.display = 'flex';
    if (type === 'prompt') inputEl.focus();
  });
};

// 呼び出し用の短い名前を用意
const customAlert = (msg) => showCustomModal('alert', msg);
const customConfirm = (msg) => showCustomModal('confirm', msg);
const customPrompt = (msg, def = '') => showCustomModal('prompt', msg, def);