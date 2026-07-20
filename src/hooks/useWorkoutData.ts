import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function useWorkoutData() {
  const { data, error, isLoading, mutate } = useSWR('/api/data', fetcher, {
    // データは頻繁に変わらないので、1時間キャッシュを維持しつつバックグラウンド更新する
    dedupingInterval: 60000,
    revalidateOnFocus: true,
  });

  return {
    data: data?.data || [],
    isLoading,
    isError: error,
    mutate,
  };
}
