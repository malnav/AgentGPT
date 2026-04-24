import { RefreshCw, Quote } from "lucide-react";
import { useGetQuote } from "@workspace/api-client-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function QuoteCard() {
  const { data, isLoading, isError, refetch, isFetching } = useGetQuote();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Quote of the moment
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        )}
        {isError && (
          <p className="text-sm text-destructive">Failed to load quote.</p>
        )}
        {data && (
          <div className="space-y-2">
            <Quote className="h-5 w-5 text-muted-foreground" />
            <p className="text-base leading-relaxed">{data.text}</p>
          </div>
        )}
      </CardContent>
      {data && (
        <CardFooter className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">— {data.author}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="Refresh quote"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
