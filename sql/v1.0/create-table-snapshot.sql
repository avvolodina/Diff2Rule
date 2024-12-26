-- "d2r-v1.0"."snapshot" definition

-- Drop table

-- DROP TABLE "d2r-v1.0"."snapshot";

CREATE TABLE "d2r-v1.0"."snapshot" (
	id serial4 NOT NULL,
	tq_id int4 NULL,
	"label" varchar(255) NULL,
	notes text NULL,
	complete_ts timestamp NULL,
	status varchar(100) NULL,
	CONSTRAINT snapshot_pkey PRIMARY KEY (id),
	CONSTRAINT snapshot_tq_id_fkey FOREIGN KEY (tq_id) REFERENCES "d2r-v1.0".target_query(id)
);